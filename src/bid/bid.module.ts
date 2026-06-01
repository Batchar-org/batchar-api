import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bid } from './entities/bid.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { BidService } from './bid.service';
import { BidController } from './bid.controller';
import { ProductModule } from '../product/product.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bid, Product, User]),
    ProductModule,
    forwardRef(() => WebSocketModule),
    BlockModule,
  ],
  controllers: [BidController],
  providers: [BidService],
  exports: [BidService, TypeOrmModule],
})
export class BidModule {}
