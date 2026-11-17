import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wish } from './entities/wish.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { Bid } from '../bid/entities/bid.entity';
import { WishService } from './service/wish.service';
import { WishController } from './controller/wish.controller';
import { ProductModule } from '../product/product.module';
import { WishRepository } from './repository/wish.repository';
import { ProductRepository } from '../product/repository/product.repository';
import { UserRepository } from '../user/repository/user.repository';
import { BidRepository } from '../bid/repository/bid.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wish, Product, User, Bid]),
    ProductModule,
  ],
  controllers: [WishController],
  providers: [
    WishService,
    WishRepository,
    ProductRepository,
    UserRepository,
    BidRepository,
  ],
  exports: [WishService, TypeOrmModule],
})
export class WishModule {}
