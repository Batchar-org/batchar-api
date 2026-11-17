import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '../../infra/redis/redis.module';
import { StorageModule } from '../../infra/storage/storage.module';

import { AuctionModule } from '../auction/auction.module';
import { Bid } from '../bid/entities/bid.entity';
import { BidRepository } from '../bid/repository/bid.repository';
import { BlockModule } from '../block/block.module';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';
import { Wish } from '../wish/entities/wish.entity';
import { WishRepository } from '../wish/repository/wish.repository';

import { ProductSseController } from './controller/product-sse.controller';
import { ProductController } from './controller/product.controller';
import { ProductMedia } from './entities/product-media.entity';
import { Product } from './entities/product.entity';
import { ProductMediaRepository } from './repository/product-media.repository';
import { ProductRepository } from './repository/product.repository';
import { ProductMediaService } from './service/product-media.service';
import { ProductRetentionCleanupService } from './service/product-retention-cleanup.service';
import { ProductService } from './service/product.service';
import { SseService } from './service/sse.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductMedia, User, Wish, Bid]),
    StorageModule,
    RedisModule,
    forwardRef(() => AuctionModule),
    BlockModule,
  ],
  controllers: [ProductController, ProductSseController],
  providers: [
    ProductService,
    ProductMediaService,
    ProductRetentionCleanupService,
    SseService,
    ProductRepository,
    ProductMediaRepository,
    UserRepository,
    WishRepository,
    BidRepository,
  ],
  exports: [ProductService, ProductMediaService, SseService, TypeOrmModule],
})
export class ProductModule {}
