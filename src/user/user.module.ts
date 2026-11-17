import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { Bid } from '../bid/entities/bid.entity';
import { Wish } from '../wish/entities/wish.entity';
import { UserService } from './service/user.service';
import { UserController } from './controller/user.controller';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../common/storage/storage.module';
import { UserRepository } from './repository/user.repository';
import { ProductRepository } from '../product/repository/product.repository';
import { BidRepository } from '../bid/repository/bid.repository';
import { WishRepository } from '../wish/repository/wish.repository';

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
