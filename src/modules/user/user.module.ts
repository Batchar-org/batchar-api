import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StorageModule } from '../../infra/storage/storage.module';

import { AuthModule } from '../auth/auth.module';
import { Bid } from '../bid/entities/bid.entity';
import { BidRepository } from '../bid/repository/bid.repository';
import { Product } from '../product/entities/product.entity';
import { ProductRepository } from '../product/repository/product.repository';
import { Wish } from '../wish/entities/wish.entity';
import { WishRepository } from '../wish/repository/wish.repository';

import { UserController } from './controller/user.controller';
import { User } from './entities/user.entity';
import { UserRepository } from './repository/user.repository';
import { UserService } from './service/user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Product, Bid, Wish]),
    forwardRef(() => AuthModule),
    StorageModule,
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    ProductRepository,
    BidRepository,
    WishRepository,
  ],
  exports: [TypeOrmModule, UserService],
})
export class UserModule {}
