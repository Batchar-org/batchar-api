import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Like } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductMedia } from './entities/product-media.entity';
import { User } from '../user/entities/user.entity';
import { Wish } from '../wish/entities/wish.entity';
import { Bid } from '../bid/entities/bid.entity';
import { ProductMediaService } from './product-media.service';
import { RedisService } from '../common/redis/redis.service';
import { BlockService } from '../block/block.service';
import { BusinessException } from '../common/exceptions/business.exception';
import {
  ProductResponse,
  ProductCreateRequest,
  ProductListRequest,
  ProductSummary,
  ProductDetailResponse,
  ProductUpdateRequest,
} from './dto/product.dto';
import { ProductStatus } from './entities/product-status.enum';
import { ProductViewType, requiresAuth } from './entities/product-view-type.enum';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private static readonly AUCTION_KEY_PREFIX = 'auction:';

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wish)
    private readonly wishRepository: Repository<Wish>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    private readonly productMediaService: ProductMediaService,
    private readonly redisService: RedisService,
    private readonly blockService: BlockService,
    private readonly dataSource: DataSource,
  ) {}

  async createProduct(
    sellerId: number,
    request: ProductCreateRequest,
    files: Express.Multer.File[],
  ): Promise<ProductResponse> {
    const seller = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!seller) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = Product.create(
        seller,
        request.title,
        request.description,
        request.category,
        request.startPrice,
        request.endTime,
      );

      await queryRunner.manager.save(product);
      await this.productMediaService.saveMedia(product, files, queryRunner.manager);

      await queryRunner.commitTransaction();

      // 트랜잭션이 성공적으로 처리된 뒤 Redis TTL에 경매 만료시각을 등록합니다.
      await this.registerAuctionTtl(product.id, product.endTime);

      return new ProductResponse(product.id);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create product', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getProducts(userId: number | null, request: ProductListRequest) {
    const { page, size, view, category, keyword } = request;

    if (requiresAuth(view) && !userId) {
      throw new BusinessException('UNAUTHORIZED');
    }

    const skip = page * size;
    const take = size + 1; // hasNext 판별을 위해 1개 더 조회

    let products: Product[] = [];

    // 키워드 와일드카드 검색 팩터 빌드 (스프링과 동일하게 공백을 %로 변환)
    const keywordPattern = this.buildKeywordPattern(keyword);

    // View 타입에 맞춰 쿼리 빌더를 이용하여 조회 분기 처리
    const qb = this.productRepository.createQueryBuilder('product');
    qb.leftJoinAndSelect('product.seller', 'seller');

    if (view === ProductViewType.MY_PRODUCTS) {
      qb.where('product.seller_id = :userId', { userId });
    } else if (view === ProductViewType.MY_BIDS) {
      qb.innerJoin('bids', 'bid', 'bid.product_id = product.id')
        .where('bid.bidder_id = :userId', { userId })
        .andWhere('product.status = :status', { status: ProductStatus.ON_SALE });
    } else {
      qb.where('product.status = :status', { status: ProductStatus.ON_SALE });
    }

    if (category) {
      qb.andWhere('product.category = :category', { category });
    }

    if (keywordPattern) {
      qb.andWhere('LOWER(product.title) LIKE LOWER(:keyword)', { keyword: keywordPattern });
    }

    // 숨김(HIDDEN) 처리된 상품은 모든 뷰에서 제외
    qb.andWhere('product.status != :hiddenStatus', { hiddenStatus: ProductStatus.HIDDEN });

    // 차단 관계(양방향)인 판매자의 상품 제외
    if (userId) {
      const blockedUserIds = await this.blockService.getBlockedUserIds(userId);
      if (blockedUserIds.length > 0) {
        qb.andWhere('product.seller_id NOT IN (:...blockedUserIds)', { blockedUserIds });
      }
    }

    // 정렬 분기
    if (view === ProductViewType.POPULAR) {
      // 찜 수 기준 정렬을 서브쿼리나 leftJoin 찜 카운트로 수행
      qb.leftJoin('wishes', 'wish', 'wish.product_id = product.id')
        .groupBy('product.id, seller.id')
        .orderBy('COUNT(wish.id)', 'DESC')
        .addOrderBy('product.created_at', 'DESC');
    } else if (view === ProductViewType.ENDING_SOON) {
      qb.orderBy('product.end_time', 'ASC');
    } else {
      // LATEST / ALL / MY_PRODUCTS / MY_BIDS 등은 생성시각 역순
      qb.orderBy('product.created_at', 'DESC');
    }

    products = await qb.skip(skip).take(take).getMany();

    const hasNext = products.length > size;
    const slicedContent = hasNext ? products.slice(0, size) : products;

    const content: ProductSummary[] = [];
    for (const product of slicedContent) {
      const mainImageUrl = await this.productMediaService.getFirstMediaUrl(product.id);
      const wishCount = await this.wishRepository.count({ where: { product: { id: product.id } } });
      
      // 입찰자 중복 제외 카운트
      const bidCountResult = await this.bidRepository
        .createQueryBuilder('bid')
        .select('COUNT(DISTINCT bid.bidder_id)', 'count')
        .where('bid.product_id = :productId', { productId: product.id })
        .getRawOne();
      const bidCount = parseInt(bidCountResult?.count || '0', 10);

      content.push({
        id: product.id,
        sellerName: product.seller.name,
        sellerProfileImageUrl: product.seller.profileImageUrl,
        title: product.title,
        startPrice: Number(product.startPrice),
        currentPrice: Number(product.currentPrice),
        status: product.status,
        endTime: product.endTime,
        mainImageUrl,
        wishCount,
        bidCount,
      });
    }

    return {
      content,
      hasNext,
    };
  }

  async getProductDetail(productId: number, userId: number | null): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: { seller: true, winner: true },
    });

    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    // 내가 현재 이 상품의 최고가 입찰자인지 판별
    let isTopBidder = false;
    if (userId) {
      const myHighestBid = await this.bidRepository.findOne({
        where: { bidder: { id: userId }, product: { id: productId } },
        order: { price: 'DESC' },
      });
      if (myHighestBid) {
        isTopBidder = Number(myHighestBid.price) === Number(product.currentPrice);
      }
    }

    const mediaUrls = await this.productMediaService.getMediaInfoByProductId(productId);
    const wishCount = await this.wishRepository.count({ where: { product: { id: productId } } });
    
    const bidCountResult = await this.bidRepository
      .createQueryBuilder('bid')
      .select('COUNT(DISTINCT bid.bidder_id)', 'count')
      .where('bid.product_id = :productId', { productId })
      .getRawOne();
    const bidCount = parseInt(bidCountResult?.count || '0', 10);

    const isWished = userId
      ? await this.wishRepository.exists({ where: { user: { id: userId }, product: { id: productId } } })
      : false;

    return {
      id: product.id,
      sellerId: product.seller.id,
      sellerName: product.seller.name,
      sellerProfileImageUrl: product.seller.profileImageUrl,
      winnerName: product.winner ? product.winner.name : null,
      winnerProfileImageUrl: product.winner ? product.winner.profileImageUrl : null,
      title: product.title,
      description: product.description,
      category: product.category,
      startPrice: Number(product.startPrice),
      currentPrice: Number(product.currentPrice),
      status: product.status,
      startTime: product.startTime,
      endTime: product.endTime,
      isTopBidder,
      mediaUrls,
      wishCount,
      bidCount,
      isWished,
    };
  }

  async updateProduct(
    productId: number,
    userId: number,
    request: ProductUpdateRequest,
    files?: Express.Multer.File[],
  ): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: { seller: true },
    });

    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    if (Number(product.seller.id) !== Number(userId)) {
      throw new BusinessException('PRODUCT_UPDATE_FORBIDDEN');
    }

    if (product.isClosed()) {
      throw new BusinessException('AUCTION_ALREADY_CLOSED');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      product.updateInfo(request.title, request.description, request.category, request.endTime);
      await queryRunner.manager.save(product);

      // 삭제 미디어 처리
      if (request.deleteMediaIds && request.deleteMediaIds.length > 0) {
        await this.productMediaService.validateMinimumMediaCount(productId, request.deleteMediaIds, files);
        await this.productMediaService.deleteMediaByIds(productId, request.deleteMediaIds, queryRunner.manager);
      }

      // 신규 미디어 추가
      if (files && files.length > 0) {
        await this.productMediaService.saveMedia(product, files, queryRunner.manager);
      }

      await queryRunner.commitTransaction();

      // 마감 정보가 수정되었을 수 있으므로 Redis 만료시각을 재등록
      await this.registerAuctionTtl(product.id, product.endTime);

      return this.getProductDetail(productId, userId);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to update product', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteProduct(productId: number, userId: number): Promise<ProductResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: { seller: true },
    });

    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    if (Number(product.seller.id) !== Number(userId)) {
      throw new BusinessException('PRODUCT_DELETE_FORBIDDEN');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 미디어, 입찰, 찜 삭제 후 상품 삭제
      await this.productMediaService.deleteAllByProductId(productId, queryRunner.manager);
      await queryRunner.manager.delete(Bid, { product: { id: productId } });
      await queryRunner.manager.delete(Wish, { product: { id: productId } });
      await queryRunner.manager.remove(product);

      await queryRunner.commitTransaction();

      // Redis TTL 삭제
      await this.deleteAuctionTtl(productId);

      return new ProductResponse(productId);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to delete product', e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private buildKeywordPattern(keyword?: string): string | null {
    if (!keyword || keyword.trim() === '') return null;
    return `%${keyword.trim().replace(/\s+/g, '%')}%`;
  }

  private async registerAuctionTtl(productId: number, endTime: Date): Promise<void> {
    try {
      const key = ProductService.AUCTION_KEY_PREFIX + productId;
      const ttlSeconds = Math.max(Math.floor((endTime.getTime() - Date.now()) / 1000), 0);
      await this.redisService.set(key, '', ttlSeconds);
    } catch (e) {
      this.logger.error(`Failed to register Redis TTL for product=${productId}`, e);
    }
  }

  private async deleteAuctionTtl(productId: number): Promise<void> {
    try {
      const key = ProductService.AUCTION_KEY_PREFIX + productId;
      await this.redisService.delete(key);
    } catch (e) {
      this.logger.error(`Failed to delete Redis TTL for product=${productId}`, e);
    }
  }
}
