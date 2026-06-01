import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { AuctionCloseManager } from './auction-close.manager';
import { AuctionExpiredListener } from './auction-expired.listener';
import { AuctionCloseService } from './auction-close.service';
import { ChatModule } from '../chat/chat.module';
import { ProductModule } from '../product/product.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    ChatModule,
    forwardRef(() => ProductModule),
    RedisModule,
  ],
  providers: [AuctionCloseManager, AuctionExpiredListener, AuctionCloseService],
  exports: [AuctionCloseManager, AuctionCloseService],
})
export class AuctionModule {}
