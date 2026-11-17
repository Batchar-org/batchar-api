import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ProductRepository } from '../../product/repository/product.repository';

import { AuctionCloseManager } from './auction-close.manager';

@Injectable()
export class AuctionCloseService {
  private readonly logger = new Logger(AuctionCloseService.name);

  constructor(
    private readonly productRepository: ProductRepository,
    private readonly auctionCloseManager: AuctionCloseManager,
  ) {}

  // 5분마다 구동되는 백업 배치 크론 (Spring Boot의 cron = "0 */5 * * * *" 매핑)
  @Cron('0 */5 * * * *')
  async closeExpiredBids(): Promise<void> {
    this.logger.log('경매 마감 스케줄러 실행');
    try {
      const expiredProducts = await this.productRepository.findExpiredOnSale(
        new Date(),
      );

      if (expiredProducts.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${expiredProducts.length} expired products for closing. Starting closing process...`,
      );
      for (const product of expiredProducts) {
        try {
          await this.auctionCloseManager.closeAuction(product.id);
        } catch (e) {
          this.logger.error(`경매 마감 처리 실패 productId=${product.id}`, e);
        }
      }
    } catch (e) {
      this.logger.error(
        'Failed to query expired products in backup scheduler',
        e,
      );
    }
  }
}
