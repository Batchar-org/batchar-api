import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Bid } from '../bid/entities/bid.entity';
import { BidRepository } from '../bid/repository/bid.repository';
import { Product } from '../product/entities/product.entity';
import { ProductModule } from '../product/product.module';
import { ProductRepository } from '../product/repository/product.repository';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';

import { WishController } from './controller/wish.controller';
import { Wish } from './entities/wish.entity';
import { WishRepository } from './repository/wish.repository';
import { WishService } from './service/wish.service';

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
