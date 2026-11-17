import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Bid } from '../entities/bid.entity';
import { BidRepository } from '../repository/bid.repository';
import { ProductRepository } from '../../product/repository/product.repository';
import { UserRepository } from '../../user/repository/user.repository';
import { BidCreateRequest } from '../dto/bid-create-request.dto';
import { BidListRequest } from '../dto/bid-list-request.dto';
import { BidResponse } from '../dto/bid-response.dto';
import { BidSummary } from '../dto/bid-summary.dto';
import { BidBroadcast } from '../dto/bid-broadcast.dto';
import { SseService } from '../../product/service/sse.service';
import { BlockService } from '../../block/service/block.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { NotificationService } from '../../notification/service/notification.service';

// 순환 참조 방지를 위해 BidGateway의 타입 임포트
import { BidGateway } from '../../websocket/gateway/bid.gateway';

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name);

  constructor(
    private readonly bidRepository: BidRepository,
    private readonly productRepository: ProductRepository,
    private readonly userRepository: UserRepository,
    private readonly sseService: SseService,
    @Inject(forwardRef(() => BidGateway))
    private readonly bidGateway: BidGateway,
    private readonly blockService: BlockService,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  async placeBid(
    productId: number,
    bidderId: number,
    request: BidCreateRequest,
  ): Promise<BidResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 입찰자 검증
      const bidder = await this.userRepository.findById(
        bidderId,
        queryRunner.manager,
      );
      if (!bidder) {
        throw new BusinessException('USER_NOT_FOUND');
      }

      // 정지/탈퇴된 사용자는 입찰 불가
      if (!bidder.isActive()) {
        throw new BusinessException('USER_SUSPENDED');
      }

      // 2. 상품 비관적 쓰기 락(PESSIMISTIC_WRITE) 조회
      const product = await this.productRepository.findByIdForUpdate(
        productId,
        queryRunner.manager,
      );

      if (!product) {
        throw new BusinessException('PRODUCT_NOT_FOUND');
      }

      // 3. 비즈니스 룰 검증
      if (product.isSeller(bidderId)) {
        throw new BusinessException('SELF_BID_NOT_ALLOWED');
      }

      // 차단 관계(양방향)인 판매자의 상품에는 입찰 불가
      if (
        await this.blockService.isBlocked(
          bidderId,
          Number(product.seller.id),
          queryRunner.manager,
        )
      ) {
        throw new BusinessException('BLOCKED');
      }

      if (!product.isOnSale()) {
        throw new BusinessException('AUCTION_CLOSED');
      }

      if (!product.isValidBidPrice(request.price)) {
        throw new BusinessException('INVALID_BID_PRICE');
      }

      // outbid 알림 대상(직전 최고입찰자)을 가격 갱신/입찰 저장 전에 같은 락 안에서 조회
      const previousHighestBid = await this.bidRepository.findHighestByProduct(
        productId,
        queryRunner.manager,
      );

      // 4. 가격 상승 및 저장
      product.raisePriceTo(request.price);
      await this.productRepository.save(product, queryRunner.manager);

      // 5. 입찰 내역 등록
      const bid = Bid.place(product, bidder, request.price);
      await this.bidRepository.save(bid, queryRunner.manager);

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
        this.logger.error(
          `WebSocket broadcast failed for product=${productId}`,
          err,
        );
      });

      // 푸시/인앱 알림 발송 (커밋 후 fire-and-forget, 내부에서 예외를 격리함)
      void this.notificationService.notifyBidPlaced({
        sellerId: Number(product.seller.id),
        productId,
        productTitle: product.title,
        bidderName: bidder.name,
        price: request.price,
      });

      if (
        previousHighestBid &&
        Number(previousHighestBid.bidder.id) !== bidderId
      ) {
        void this.notificationService.notifyOutbid({
          previousBidderId: Number(previousHighestBid.bidder.id),
          productId,
          productTitle: product.title,
          newPrice: request.price,
        });
      }

      return BidResponse.from(bid);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to place bid for product=${productId} by bidder=${bidderId}`,
        e,
      );
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getBids(productId: number, request: BidListRequest) {
    const { page, size } = request;
    const skip = page * size;
    const take = size + 1;

    const exists = await this.productRepository.existsById(productId);
    if (!exists) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    // JPA의 findByProductIdWithBidder (ORDER BY b.price DESC) 슬라이스 페이징 구현
    const bids = await this.bidRepository.findPageByProduct(
      productId,
      skip,
      take,
    );

    const hasNext = bids.length > size;
    const slicedBids = hasNext ? bids.slice(0, size) : bids;

    const content = slicedBids.map((bid) => BidSummary.from(bid));

    return {
      content,
      hasNext,
    };
  }
}
