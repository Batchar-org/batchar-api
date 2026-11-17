import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductRepository } from '../repository/product.repository';
import { UserRepository } from '../../user/repository/user.repository';
import { WishRepository } from '../../wish/repository/wish.repository';
import { BidRepository } from '../../bid/repository/bid.repository';
import { ProductMediaService } from './product-media.service';
import { RedisService } from '../../common/redis/service/redis.service';
import { BlockService } from '../../block/service/block.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ProductResponse } from '../dto/product-response.dto';
import { ProductCreateRequest } from '../dto/product-create-request.dto';
import { ProductListRequest } from '../dto/product-list-request.dto';
import { ProductSummary } from '../dto/product-summary.dto';
import { ProductDetailResponse } from '../dto/product-detail-response.dto';
import { ProductUpdateRequest } from '../dto/product-update-request.dto';
import { ProductStatus } from '../enum/product-status.enum';
import { requiresAuth } from '../enum/product-view-type.enum';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private static readonly AUCTION_KEY_PREFIX = 'auction:';
  private static readonly DEFAULT_HISTORY_RETENTION_YEARS = 3;
  private static readonly COMPLETED_PRODUCT_RETENTION_YEARS = 5;
  private static readonly RETENTION_PURGE_BATCH_SIZE = 100;

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly wishRepository: WishRepository,
    private readonly bidRepository: BidRepository,
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
    const seller = await this.userRepository.findById(sellerId);
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

      await this.productRepository.save(product, queryRunner.manager);
      await this.productMediaService.saveMedia(
        product,
        files,
        queryRunner.manager,
      );

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

    // 키워드 와일드카드 검색 팩터 빌드 (스프링과 동일하게 공백을 %로 변환)
    const keywordPattern = this.buildKeywordPattern(keyword);

    // 차단 관계(양방향)인 판매자의 상품 제외
    const blockedUserIds = userId
      ? await this.blockService.getBlockedUserIds(userId)
      : [];

    const products = await this.productRepository.findList({
      view,
      userId,
      category,
      keywordPattern,
      blockedUserIds,
      skip,
      take,
    });

    const hasNext = products.length > size;
    const slicedContent = hasNext ? products.slice(0, size) : products;

    const content: ProductSummary[] = [];
    for (const product of slicedContent) {
      const mainImageUrl = await this.productMediaService.getFirstMediaUrl(
        product.id,
      );
      const wishCount = await this.wishRepository.countByProduct(product.id);

      // 입찰자 중복 제외 카운트
      const bidCount = await this.bidRepository.countDistinctBidders(
        product.id,
      );
      const myBidPrice = userId
        ? await this.findMyHighestBidPrice(userId, product.id)
        : null;

      content.push({
        id: product.id,
        sellerName: product.seller.name,
        sellerProfileImageUrl: product.seller.profileImageUrl,
        title: product.title,
        startPrice: Number(product.startPrice),
        currentPrice: Number(product.currentPrice),
        myBidPrice,
        status: product.status,
        endTime: product.endTime,
        mainImageUrl,
        wishCount,
        bidCount,
        isWinner: userId
          ? Number(product.winner?.id) === Number(userId)
          : false,
      });
    }

    return {
      content,
      hasNext,
    };
  }

  async getProductDetail(
    productId: number,
    userId: number | null,
  ): Promise<ProductDetailResponse> {
    const product =
      await this.productRepository.findByIdWithSellerAndWinner(productId);

    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    if (product.status === ProductStatus.DELETED) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    // 내가 현재 이 상품의 최고가 입찰자인지 판별
    let isTopBidder = false;
    if (userId) {
      const myHighestBid =
        await this.bidRepository.findHighestByBidderAndProduct(
          userId,
          productId,
        );
      if (myHighestBid) {
        isTopBidder =
          Number(myHighestBid.price) === Number(product.currentPrice);
      }
    }

    const mediaUrls =
      await this.productMediaService.getMediaInfoByProductId(productId);
    const wishCount = await this.wishRepository.countByProduct(productId);

    const bidCount = await this.bidRepository.countDistinctBidders(productId);

    const isWished = userId
      ? await this.wishRepository.existsByUserAndProduct(userId, productId)
      : false;

    return {
      id: product.id,
      sellerId: product.seller.id,
      sellerName: product.seller.name,
      sellerProfileImageUrl: product.seller.profileImageUrl,
      sellerFertility: Number(product.seller.fertility),
      winnerName: product.winner ? product.winner.name : null,
      winnerProfileImageUrl: product.winner
        ? product.winner.profileImageUrl
        : null,
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
    const product = await this.productRepository.findByIdWithSeller(productId);

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
      product.updateInfo(
        request.title,
        request.description,
        request.category,
        request.endTime,
      );
      await this.productRepository.save(product, queryRunner.manager);

      // 삭제 미디어 처리
      if (request.deleteMediaIds && request.deleteMediaIds.length > 0) {
        await this.productMediaService.validateMinimumMediaCount(
          productId,
          request.deleteMediaIds,
          files,
        );
        await this.productMediaService.deleteMediaByIds(
          productId,
          request.deleteMediaIds,
          queryRunner.manager,
        );
      }

      // 신규 미디어 추가
      if (files && files.length > 0) {
        await this.productMediaService.saveMedia(
          product,
          files,
          queryRunner.manager,
        );
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

  async deleteProduct(
    productId: number,
    userId: number,
  ): Promise<ProductResponse> {
    const product = await this.productRepository.findByIdWithSeller(productId);

    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    if (Number(product.seller.id) !== Number(userId)) {
      throw new BusinessException('PRODUCT_DELETE_FORBIDDEN');
    }

    return this.markProductAsDeleted(product);
  }

  async deleteProductByAdmin(productId: number): Promise<ProductResponse> {
    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    return this.markProductAsDeleted(product);
  }

  async purgeExpiredDeletedProducts(now = new Date()): Promise<number> {
    const defaultRetentionDate = this.subtractYears(
      now,
      ProductService.DEFAULT_HISTORY_RETENTION_YEARS,
    );
    const completedRetentionDate = this.subtractYears(
      now,
      ProductService.COMPLETED_PRODUCT_RETENTION_YEARS,
    );

    const expiredProducts = await this.productRepository.findPurgeableDeleted(
      completedRetentionDate,
      defaultRetentionDate,
      ProductService.RETENTION_PURGE_BATCH_SIZE,
    );

    let purgedCount = 0;
    for (const product of expiredProducts) {
      try {
        await this.physicallyDeleteProduct(product);
        purgedCount += 1;
      } catch (e) {
        this.logger.error(`Failed to purge expired product=${product.id}`, e);
      }
    }

    return purgedCount;
  }

  private async markProductAsDeleted(
    product: Product,
  ): Promise<ProductResponse> {
    const productId = Number(product.id);
    if (product.status !== ProductStatus.DELETED || !product.deletedAt) {
      product.markAsDeleted();
      await this.productRepository.save(product);
      await this.deleteAuctionTtl(productId);
    }
    return new ProductResponse(productId);
  }

  private async physicallyDeleteProduct(product: Product): Promise<void> {
    const productId = Number(product.id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.productMediaService.deleteAllByProductId(
        productId,
        queryRunner.manager,
      );
      await this.bidRepository.deleteAllByProduct(
        productId,
        queryRunner.manager,
      );
      await this.wishRepository.deleteAllByProduct(
        productId,
        queryRunner.manager,
      );
      await this.productRepository.deleteById(productId, queryRunner.manager);

      await queryRunner.commitTransaction();
      await this.deleteAuctionTtl(productId);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private buildKeywordPattern(keyword?: string): string | null {
    if (!keyword || keyword.trim() === '') return null;
    return `%${keyword.trim().replace(/\s+/g, '%')}%`;
  }

  private async findMyHighestBidPrice(
    userId: number,
    productId: number,
  ): Promise<number | null> {
    const bid = await this.bidRepository.findHighestByBidderAndProduct(
      userId,
      productId,
    );
    return bid ? Number(bid.price) : null;
  }

  private async registerAuctionTtl(
    productId: number,
    endTime: Date,
  ): Promise<void> {
    try {
      const key = ProductService.AUCTION_KEY_PREFIX + productId;
      const ttlSeconds = Math.max(
        Math.floor((endTime.getTime() - Date.now()) / 1000),
        0,
      );
      await this.redisService.set(key, '', ttlSeconds);
    } catch (e) {
      this.logger.error(
        `Failed to register Redis TTL for product=${productId}`,
        e,
      );
    }
  }

  private async deleteAuctionTtl(productId: number): Promise<void> {
    try {
      const key = ProductService.AUCTION_KEY_PREFIX + productId;
      await this.redisService.delete(key);
    } catch (e) {
      this.logger.error(
        `Failed to delete Redis TTL for product=${productId}`,
        e,
      );
    }
  }

  private subtractYears(date: Date, years: number): Date {
    const result = new Date(date.getTime());
    result.setFullYear(result.getFullYear() - years);
    return result;
  }
}
