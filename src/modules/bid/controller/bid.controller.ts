import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';

import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';

import { BidCreateRequest } from '../dto/bid-create-request.dto';
import { BidListRequest } from '../dto/bid-list-request.dto';
import { BidService } from '../service/bid.service';

@Controller('api/products/:productId/bids')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  async placeBid(
    @Param('productId') productId: number,
    @Body() request: BidCreateRequest,
    @CurrentUser() bidderId: number,
  ) {
    const data = await this.bidService.placeBid(
      Number(productId),
      bidderId,
      request,
    );
    return {
      data,
      message: '입찰에 성공하였습니다.',
    };
  }

  @Get()
  @HttpCode(200)
  async getBids(
    @Param('productId') productId: number,
    @Query() request: BidListRequest,
  ) {
    const data = await this.bidService.getBids(Number(productId), request);
    return {
      data,
      message: '입찰 내역을 조회했습니다.',
    };
  }
}
