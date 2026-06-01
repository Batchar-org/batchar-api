import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { ProductStatus } from '../product/entities/product-status.enum';
import { AuctionCloseManager } from './auction-close.manager';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AuctionCloseService {
  private readonly logger = new Logger(AuctionCloseService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly auctionCloseManager: AuctionCloseManager,
  ) {}

  // 5분마다 구동되는 백업 배치 크론 (Spring Boot의 cron = "0 */5 * * * *" 매핑)
  @Cron('0 */5 * * * *')
  async closeExpiredBids(): Promise<void> {
    this.logger.log('경매 마감 스케줄러 실행');
    try {
      const expiredProducts = await this.productRepository.find({
        where: {
          status: ProductStatus.ON_SALE,
          endTime: LessThan(new Date()),
        },
      });

      if (expiredProducts.length === 0) {
        return;
      }

      this.logger.log(`Found ${expiredProducts.length} expired products for closing. Starting closing process...`);
      for (const product of expiredProducts) {
        try {
          await this.auctionCloseManager.closeAuction(product.id);
        } catch (e) {
          this.logger.error(`경매 마감 처리 실패 productId=${product.id}`, e);
        }
      }
    } catch (e) {
      this.logger.error('Failed to query expired products in backup scheduler', e);
    }
  }
}
