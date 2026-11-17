import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';

import { BlockController } from './controller/block.controller';
import { Block } from './entities/block.entity';
import { BlockRepository } from './repository/block.repository';
import { BlockService } from './service/block.service';

@Module({
  imports: [TypeOrmModule.forFeature([Block, User])],
  controllers: [BlockController],
  providers: [BlockService, BlockRepository, UserRepository],
  exports: [BlockService, TypeOrmModule],
})
export class BlockModule {}
