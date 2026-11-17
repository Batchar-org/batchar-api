import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { AuctionCloseManager } from './service/auction-close.manager';
import { AuctionExpiredListener } from './listener/auction-expired.listener';
import { AuctionCloseService } from './service/auction-close.service';
import { ChatModule } from '../chat/chat.module';
import { ProductModule } from '../product/product.module';
import { RedisModule } from '../common/redis/redis.module';
import { Bid } from '../bid/entities/bid.entity';
import { ProductRepository } from '../product/repository/product.repository';
import { BidRepository } from '../bid/repository/bid.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Bid]),
    ChatModule,
    forwardRef(() => ProductModule),
    RedisModule,
  ],
  providers: [
    AuctionCloseManager,
    AuctionExpiredListener,
    AuctionCloseService,
    ProductRepository,
    BidRepository,
  ],
  exports: [AuctionCloseManager, AuctionCloseService],
})
export class AuctionModule {}
