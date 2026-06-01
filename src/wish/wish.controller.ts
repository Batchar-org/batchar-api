import { Controller, Post, Delete, Get, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { WishService } from './wish.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WishListRequest } from './dto/wish.dto';

@Controller('api/wishes')
@UseGuards(JwtAuthGuard)
export class WishController {
  constructor(private readonly wishService: WishService) {}

  @Post(':productId')
  @HttpCode(201)
  async addWish(
    @Param('productId') productId: number,
    @CurrentUser() userId: number,
  ) {
    await this.wishService.addWish(Number(productId), userId);
    return {
      data: null,
      message: '찜 등록에 성공하였습니다.',
    };
  }

  @Delete(':productId')
  @HttpCode(200)
  async removeWish(
    @Param('productId') productId: number,
    @CurrentUser() userId: number,
  ) {
    await this.wishService.removeWish(Number(productId), userId);
    return {
      data: null,
      message: '찜 취소에 성공하였습니다.',
    };
  }

  @Get()
  @HttpCode(200)
  async getWishes(
    @Query() request: WishListRequest,
    @CurrentUser() userId: number,
  ) {
    const data = await this.wishService.getWishes(userId, request);
    return {
      data,
      message: '찜 목록을 조회했습니다.',
    };
  }
}
