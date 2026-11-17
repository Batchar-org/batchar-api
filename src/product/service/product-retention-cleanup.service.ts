import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProductService } from './product.service';

@Injectable()
export class ProductRetentionCleanupService {
  private readonly logger = new Logger(ProductRetentionCleanupService.name);

  constructor(private readonly productService: ProductService) {}

  @Cron('0 0 3 * * *', { timeZone: 'Asia/Seoul' })
  async purgeExpiredDeletedProducts(): Promise<void> {
    try {
      const purgedCount =
        await this.productService.purgeExpiredDeletedProducts();

      if (purgedCount > 0) {
        this.logger.log(`Purged ${purgedCount} expired deleted products`);
      }
    } catch (e) {
      this.logger.error('Failed to purge expired deleted products', e);
    }
  }
}
