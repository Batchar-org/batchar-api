import { Module } from '@nestjs/common';

import { StorageModule } from '../../infra/storage/storage.module';

import { StorageController } from './controller/storage.controller';

@Module({
  imports: [StorageModule],
  controllers: [StorageController],
})
export class StorageApiModule {}
