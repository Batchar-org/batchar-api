import { Module } from '@nestjs/common';

import { StorageService } from './service/storage.service';

// S3 접근만 담당하는 인프라 모듈. 업로드 URL 발급 API는 modules/storage(StorageApiModule).
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
