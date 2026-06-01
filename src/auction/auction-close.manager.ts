import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { ProductStatus } from '../product/entities/product-status.enum';
import { Bid } from '../bid/entities/bid.entity';
import { BidStatus } from '../bid/entities/bid-status.enum';
import { ChatService } from '../chat/chat.service';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class AuctionCloseManager {
  private readonly logger = new Logger(AuctionCloseManager.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly chatService: ChatService,
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
        return;
      }

      // 낙찰 처리
      lockedProduct.closeWithWinner(highestBid.bidder);
      highestBid.closeAsWon();

      await queryRunner.manager.save(lockedProduct);
      await queryRunner.manager.save(highestBid);

      // 낙찰 채팅방 생성
      await this.chatService.generateChatRoom(lockedProduct, lockedProduct.seller, highestBid.bidder);

      await queryRunner.commitTransaction();
      this.logger.log(`[경매 낙찰 성공] productId=${productId} 낙찰자Id=${highestBid.bidder.id} 낙찰가=${highestBid.price}`);
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
        return;
      }

      lockedProduct.closeWithWinner(highestBid.bidder);
      highestBid.closeAsWon();

      await queryRunner.manager.save(lockedProduct);
      await queryRunner.manager.save(highestBid);

      await this.chatService.generateChatRoom(lockedProduct, lockedProduct.seller, highestBid.bidder);

      await queryRunner.commitTransaction();
      this.logger.log(`[경매 수동 낙찰 성공] productId=${productId} 낙찰자Id=${highestBid.bidder.id}`);
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to close auction manually for product=${productId} by seller=${sellerId}`, e);
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
}
