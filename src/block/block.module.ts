import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './entities/block.entity';
import { User } from '../user/entities/user.entity';
import { BlockService } from './service/block.service';
import { BlockController } from './controller/block.controller';
import { BlockRepository } from './repository/block.repository';
import { UserRepository } from '../user/repository/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Block, User])],
  controllers: [BlockController],
  providers: [BlockService, BlockRepository, UserRepository],
  exports: [BlockService, TypeOrmModule],
})
export class BlockModule {}
