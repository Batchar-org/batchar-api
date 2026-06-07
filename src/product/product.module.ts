import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductMedia } from './entities/product-media.entity';
import { User } from '../user/entities/user.entity';
import { Wish } from '../wish/entities/wish.entity';
import { Bid } from '../bid/entities/bid.entity';
import { ProductService } from './product.service';
import { ProductMediaService } from './product-media.service';
import { ProductRetentionCleanupService } from './product-retention-cleanup.service';
import { SseService } from './sse/sse.service';
import { ProductController } from './product.controller';
import { ProductSseController } from './product-sse.controller';
import { StorageModule } from '../common/storage/storage.module';
import { AuctionModule } from '../auction/auction.module';
import { RedisModule } from '../common/redis/redis.module';
import { BlockModule } from '../block/block.module';

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
  ],
  exports: [ProductService, ProductMediaService, SseService, TypeOrmModule],
})
export class ProductModule {}
