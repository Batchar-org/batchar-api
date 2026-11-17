import { Body, Controller, Post } from '@nestjs/common';

import { PresignedUrlRequest } from '../../../infra/storage/dto/presigned-url-request.dto';
import { StorageService } from '../../../infra/storage/service/storage.service';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  // @UseGuards(JwtAuthGuard) - Auth 모듈 구현 후 활성화 예정
  @Post('presigned-url')
  async getPresignedUrl(@Body() request: PresignedUrlRequest) {
    const data = await this.storageService.generatePresignedUrl(request);
    return {
      data,
      message: 'Presigned URL이 발급되었습니다.',
    };
  }
}
