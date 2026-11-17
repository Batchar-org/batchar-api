import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FertilityLog } from './entities/fertility-log.entity';
import { FertilityService } from './service/fertility.service';
import { FertilityController } from './controller/fertility.controller';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [TypeOrmModule.forFeature([FertilityLog]), BlockModule],
  controllers: [FertilityController],
  providers: [FertilityService],
})
export class FertilityModule {}
