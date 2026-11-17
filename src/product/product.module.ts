import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductMedia } from './entities/product-media.entity';
import { User } from '../user/entities/user.entity';
import { Wish } from '../wish/entities/wish.entity';
import { Bid } from '../bid/entities/bid.entity';
import { ProductService } from './service/product.service';
import { ProductMediaService } from './service/product-media.service';
import { ProductRetentionCleanupService } from './service/product-retention-cleanup.service';
import { SseService } from './service/sse.service';
import { ProductController } from './controller/product.controller';
import { ProductSseController } from './controller/product-sse.controller';
import { StorageModule } from '../common/storage/storage.module';
import { AuctionModule } from '../auction/auction.module';
import { RedisModule } from '../common/redis/redis.module';
import { BlockModule } from '../block/block.module';
import { ProductRepository } from './repository/product.repository';
import { ProductMediaRepository } from './repository/product-media.repository';
import { UserRepository } from '../user/repository/user.repository';
import { WishRepository } from '../wish/repository/wish.repository';
import { BidRepository } from '../bid/repository/bid.repository';

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
