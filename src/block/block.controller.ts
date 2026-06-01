import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { BlockService } from './block.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/blocks')
@UseGuards(JwtAuthGuard)
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(':userId')
  @HttpCode(201)
  async block(@Param('userId') userId: number, @CurrentUser() me: number) {
    const blockId = await this.blockService.blockUser(me, Number(userId));
    return {
      data: { blockId },
      message: '차단했습니다.',
    };
  }

  @Delete(':userId')
  @HttpCode(200)
  async unblock(@Param('userId') userId: number, @CurrentUser() me: number) {
    await this.blockService.unblockUser(me, Number(userId));
    return {
      data: null,
      message: '차단을 해제했습니다.',
    };
  }

  @Get()
  @HttpCode(200)
  async list(@CurrentUser() me: number) {
    const data = await this.blockService.getBlockList(me);
    return {
      data,
      message: '차단 목록을 조회했습니다.',
    };
  }
}
