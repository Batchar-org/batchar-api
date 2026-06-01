import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PresignedUrlRequest } from './dto/presigned-url.dto';

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
