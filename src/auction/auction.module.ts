import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Bid } from '../bid/entities/bid.entity';
import { BidRepository } from '../bid/repository/bid.repository';
import { ChatModule } from '../chat/chat.module';
import { RedisModule } from '../common/redis/redis.module';
import { Product } from '../product/entities/product.entity';
import { ProductModule } from '../product/product.module';
import { ProductRepository } from '../product/repository/product.repository';

import { AuctionExpiredListener } from './listener/auction-expired.listener';
import { AuctionCloseManager } from './service/auction-close.manager';
import { AuctionCloseService } from './service/auction-close.service';

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
