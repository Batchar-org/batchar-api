import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wish } from './entities/wish.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { Bid } from '../bid/entities/bid.entity';
import { WishService } from './wish.service';
import { WishController } from './wish.controller';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wish, Product, User, Bid]),
    ProductModule,
  ],
  controllers: [WishController],
  providers: [WishService],
  exports: [WishService, TypeOrmModule],
})
export class WishModule {}
