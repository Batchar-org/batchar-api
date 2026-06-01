import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Bid } from './entities/bid.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { BidCreateRequest, BidListRequest, BidResponse, BidSummary, BidBroadcast } from './dto/bid.dto';
import { SseService } from '../product/sse/sse.service';
import { BlockService } from '../block/block.service';
import { BusinessException } from '../common/exceptions/business.exception';

// 순환 참조 방지를 위해 BidGateway의 타입 임포트
import { BidGateway } from '../websocket/bid.gateway';

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name);

  constructor(
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly sseService: SseService,
    @Inject(forwardRef(() => BidGateway))
    private readonly bidGateway: BidGateway,
    private readonly blockService: BlockService,
    private readonly dataSource: DataSource,
  ) {}

  async placeBid(productId: number, bidderId: number, request: BidCreateRequest): Promise<BidResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 입찰자 검증
      const bidder = await queryRunner.manager.findOne(User, { where: { id: bidderId } });
      if (!bidder) {
        throw new BusinessException('USER_NOT_FOUND');
      }

      // 정지/탈퇴된 사용자는 입찰 불가
      if (!bidder.isActive()) {
        throw new BusinessException('USER_SUSPENDED');
      }

      // 2. 상품 비관적 쓰기 락(PESSIMISTIC_WRITE) 조회
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
        relations: { seller: true },
      });

      if (!product) {
        throw new BusinessException('PRODUCT_NOT_FOUND');
      }

      // 3. 비즈니스 룰 검증
      if (product.isSeller(bidderId)) {
        throw new BusinessException('SELF_BID_NOT_ALLOWED');
      }

      // 차단 관계(양방향)인 판매자의 상품에는 입찰 불가
      if (await this.blockService.isBlocked(bidderId, Number(product.seller.id))) {
        throw new BusinessException('BLOCKED');
      }

      if (!product.isOnSale()) {
        throw new BusinessException('AUCTION_CLOSED');
      }

      if (!product.isValidBidPrice(request.price)) {
        throw new BusinessException('INVALID_BID_PRICE');
      }

      // 4. 가격 상승 및 저장
      product.raisePriceTo(request.price);
      await queryRunner.manager.save(product);

      // 5. 입찰 내역 등록
      const bid = Bid.place(product, bidder, request.price);
      await queryRunner.manager.save(bid);

      await queryRunner.commitTransaction();

      // 6. 실시간 브로드캐스트 알림 발송 (성공 커밋 후 수행)
      const broadcast = new BidBroadcast(
        productId,
        product.currentPrice,
        bidder.name,
        bid.createdAt,
      );

      // SSE 알림 발송
      this.sseService.send(productId, broadcast);

      // WebSocket STOMP 알림 발송
      this.bidGateway.broadcastBid(productId, broadcast).catch((err) => {
        this.logger.error(`WebSocket broadcast failed for product=${productId}`, err);
      });

      return BidResponse.from(bid);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to place bid for product=${productId} by bidder=${bidderId}`, e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getBids(productId: number, request: BidListRequest) {
    const { page, size } = request;
    const skip = page * size;
    const take = size + 1;

    const exists = await this.productRepository.exists({ where: { id: productId } });
    if (!exists) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    // JPA의 findByProductIdWithBidder (ORDER BY b.price DESC) 슬라이스 페이징 구현
    const bids = await this.bidRepository.find({
      where: { product: { id: productId } },
      relations: { bidder: true },
      order: { price: 'DESC' },
      skip,
      take,
    });

    const hasNext = bids.length > size;
    const slicedBids = hasNext ? bids.slice(0, size) : bids;

    const content = slicedBids.map(BidSummary.from);

    return {
      content,
      hasNext,
    };
  }
}
