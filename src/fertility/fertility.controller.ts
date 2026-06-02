import { Controller, Post, Param, UseGuards, HttpCode, ParseIntPipe } from '@nestjs/common';
import { FertilityService } from './fertility.service';
import { FertilityAction } from './fertility-action.enum';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/chats')
export class FertilityController {
  constructor(private readonly fertilityService: FertilityService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':chatId/water')
  @HttpCode(200)
  async water(@Param('chatId', ParseIntPipe) chatId: number, @CurrentUser() userId: number) {
    const fertility = await this.fertilityService.react(userId, chatId, FertilityAction.WATER);
    return { data: { fertility }, message: '상대방의 밭에 물을 줬어요.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':chatId/acid-rain')
  @HttpCode(200)
  async acidRain(@Param('chatId', ParseIntPipe) chatId: number, @CurrentUser() userId: number) {
    const fertility = await this.fertilityService.react(userId, chatId, FertilityAction.ACID_RAIN);
    return { data: { fertility }, message: '상대방의 밭에 산성비를 내렸어요.' };
  }
}
