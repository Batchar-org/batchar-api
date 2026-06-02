import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { ProductStatus } from '../product/entities/product-status.enum';
import { Bid } from '../bid/entities/bid.entity';
import { BidStatus } from '../bid/entities/bid-status.enum';
import { ChatService } from '../chat/chat.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AuctionCloseManager {
  private readonly logger = new Logger(AuctionCloseManager.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
  ) {}

  // 1. 자동 마감용 (Redis TTL 만료 혹은 스케줄러 배치 호출)
  // 독립 트랜잭션 구동을 위해 QueryRunner를 새로 생성하여 처리합니다.
  async closeAuction(productId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lockedProduct = await queryRunner.manager.findOne(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
        relations: { seller: true },
      });

      if (!lockedProduct) {
        throw new BusinessException('PRODUCT_NOT_FOUND');
      }

      if (lockedProduct.status !== ProductStatus.ON_SALE) {
        this.logger.log(`[중복 마감 방지] 이미 마감된 경매 productId=${productId} status=${lockedProduct.status}`);
        await queryRunner.rollbackTransaction();
        return;
      }

      // 최고 입찰건 조회
      const highestBid = await queryRunner.manager.findOne(Bid, {
        where: { product: { id: productId } },
        order: { price: 'DESC' },
        relations: { bidder: true },
      });

      if (!highestBid) {
        lockedProduct.closeAsFailed();
        await queryRunner.manager.save(lockedProduct);
        await queryRunner.commitTransaction();
        this.logger.log(`[경매 유찰] 입찰자가 없어 유찰 처리되었습니다. productId=${productId}`);

        // 유찰 알림 (전이를 실제 수행한 이 경로에서만 발송 → 정확히 1회)
        this.dispatchAuctionFailed({
          productId,
          productTitle: lockedProduct.title,
          sellerId: Number(lockedProduct.seller.id),
        });
        return;
      }

      // 낙찰 처리
      lockedProduct.closeWithWinner(highestBid.bidder);
      highestBid.closeAsWon();

      await queryRunner.manager.save(lockedProduct);
      await queryRunner.manager.save(highestBid);

      // 낙찰 채팅방 생성
      await this.chatService.generateChatRoom(lockedProduct, lockedProduct.seller, highestBid.bidder);

      // 패찰자(낙찰자 제외) 목록을 커밋 전에 수집
      const winnerId = Number(highestBid.bidder.id);
      const loserIds = await this.collectLoserIds(queryRunner.manager, productId, winnerId);

      await queryRunner.commitTransaction();
      this.logger.log(`[경매 낙찰 성공] productId=${productId} 낙찰자Id=${highestBid.bidder.id} 낙찰가=${highestBid.price}`);

      // 낙찰/판매자/패찰 알림 (전이를 실제 수행한 이 경로에서만 발송 → 정확히 1회)
      this.dispatchAuctionWon({
        productId,
        productTitle: lockedProduct.title,
        price: Number(highestBid.price),
        sellerId: Number(lockedProduct.seller.id),
        sellerName: lockedProduct.seller.name,
        winnerId,
        winnerName: highestBid.bidder.name,
        loserIds,
      });
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to close auction automatically for product=${productId}`, e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  // 2. 수동 마감용 (판매자가 직접 호출)
  async closeAuctionManually(productId: number, sellerId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lockedProduct = await queryRunner.manager.findOne(Product, {
        where: { id: productId, seller: { id: sellerId } },
        lock: { mode: 'pessimistic_write' },
        relations: { seller: true },
      });

      if (!lockedProduct) {
        throw new BusinessException('PRODUCT_CLOSE_FORBIDDEN');
      }

      if (lockedProduct.status !== ProductStatus.ON_SALE) {
        throw new BusinessException('AUCTION_ALREADY_CLOSED');
      }

      const highestBid = await queryRunner.manager.findOne(Bid, {
        where: { product: { id: productId } },
        order: { price: 'DESC' },
        relations: { bidder: true },
      });

      if (!highestBid) {
        lockedProduct.closeAsFailed();
        await queryRunner.manager.save(lockedProduct);
        await queryRunner.commitTransaction();
        this.logger.log(`[경매 수동 유찰] 입찰자가 없어 유찰 처리되었습니다. productId=${productId}`);

        // 유찰 알림 (전이를 실제 수행한 이 경로에서만 발송 → 정확히 1회)
        this.dispatchAuctionFailed({
          productId,
          productTitle: lockedProduct.title,
          sellerId: Number(lockedProduct.seller.id),
        });
        return;
      }

      lockedProduct.closeWithWinner(highestBid.bidder);
      highestBid.closeAsWon();

      await queryRunner.manager.save(lockedProduct);
      await queryRunner.manager.save(highestBid);

      await this.chatService.generateChatRoom(lockedProduct, lockedProduct.seller, highestBid.bidder);

      // 패찰자(낙찰자 제외) 목록을 커밋 전에 수집
      const winnerId = Number(highestBid.bidder.id);
      const loserIds = await this.collectLoserIds(queryRunner.manager, productId, winnerId);

      await queryRunner.commitTransaction();
      this.logger.log(`[경매 수동 낙찰 성공] productId=${productId} 낙찰자Id=${highestBid.bidder.id}`);

      // 낙찰/판매자/패찰 알림 (전이를 실제 수행한 이 경로에서만 발송 → 정확히 1회)
      this.dispatchAuctionWon({
        productId,
        productTitle: lockedProduct.title,
        price: Number(highestBid.price),
        sellerId: Number(lockedProduct.seller.id),
        sellerName: lockedProduct.seller.name,
        winnerId,
        winnerName: highestBid.bidder.name,
        loserIds,
      });
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to close auction manually for product=${productId} by seller=${sellerId}`, e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  // 해당 상품의 입찰자 중 낙찰자를 제외한 패찰자 id 목록(중복 제거)을 반환한다.
  private async collectLoserIds(
    manager: EntityManager,
    productId: number,
    winnerId: number,
  ): Promise<number[]> {
    const bids = await manager.find(Bid, {
      where: { product: { id: productId } },
      relations: { bidder: true },
    });
    return [...new Set(bids.map((bid) => Number(bid.bidder.id)))].filter((id) => id !== winnerId);
  }

  // 낙찰 결과 알림: 낙찰자 + 판매자 + 패찰자 전원 (커밋 후 fire-and-forget)
  private dispatchAuctionWon(params: {
    productId: number;
    productTitle: string;
    price: number;
    sellerId: number;
    sellerName: string;
    winnerId: number;
    winnerName: string;
    loserIds: number[];
  }): void {
    void this.notificationService.notifyAuctionWon({
      winnerId: params.winnerId,
      productId: params.productId,
      productTitle: params.productTitle,
      price: params.price,
      sellerName: params.sellerName,
    });
    void this.notificationService.notifyAuctionSold({
      sellerId: params.sellerId,
      productId: params.productId,
      productTitle: params.productTitle,
      price: params.price,
      winnerName: params.winnerName,
    });
    for (const loserId of params.loserIds) {
      void this.notificationService.notifyAuctionLost({
        loserId,
        productId: params.productId,
        productTitle: params.productTitle,
      });
    }
  }

  // 유찰 알림: 판매자 (커밋 후 fire-and-forget)
  private dispatchAuctionFailed(params: {
    productId: number;
    productTitle: string;
    sellerId: number;
  }): void {
    void this.notificationService.notifyAuctionFailed({
      sellerId: params.sellerId,
      productId: params.productId,
      productTitle: params.productTitle,
    });
  }
}
