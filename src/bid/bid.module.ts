import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlockModule } from '../block/block.module';
import { Product } from '../product/entities/product.entity';
import { ProductModule } from '../product/product.module';
import { ProductRepository } from '../product/repository/product.repository';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';
import { WebSocketModule } from '../websocket/websocket.module';

import { BidController } from './controller/bid.controller';
import { Bid } from './entities/bid.entity';
import { BidRepository } from './repository/bid.repository';
import { BidService } from './service/bid.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, Product, User]),
    ProductModule,
    forwardRef(() => WebSocketModule),
    BlockModule,
  ],
  controllers: [BidController],
  providers: [BidService, BidRepository, ProductRepository, UserRepository],
  exports: [BidService, TypeOrmModule],
})
export class BidModule {}
