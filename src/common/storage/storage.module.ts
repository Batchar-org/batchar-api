import { Module } from '@nestjs/common';
import { StorageService } from './service/storage.service';
import { StorageController } from './controller/storage.controller';

@Module({
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
