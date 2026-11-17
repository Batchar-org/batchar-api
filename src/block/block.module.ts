import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './entities/block.entity';
import { User } from '../user/entities/user.entity';
import { BlockService } from './service/block.service';
import { BlockController } from './controller/block.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Block, User])],
  controllers: [BlockController],
  providers: [BlockService],
  exports: [BlockService, TypeOrmModule],
})
export class BlockModule {}
