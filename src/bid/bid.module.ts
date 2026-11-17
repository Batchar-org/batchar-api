import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from './entities/bid.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { BidService } from './service/bid.service';
import { BidController } from './controller/bid.controller';
import { ProductModule } from '../product/product.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { BlockModule } from '../block/block.module';
import { BidRepository } from './repository/bid.repository';
import { ProductRepository } from '../product/repository/product.repository';
import { UserRepository } from '../user/repository/user.repository';

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
