import { Body, Controller, Post, UseGuards, HttpCode } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { ReportMessageRequest } from '../dto/report-message-request.dto';
import { ReportProductRequest } from '../dto/report-product-request.dto';
import { ReportUserRequest } from '../dto/report-user-request.dto';
import { ReportService } from '../service/report.service';

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('user')
  @HttpCode(201)
  async reportUser(
    @Body() request: ReportUserRequest,
    @CurrentUser() me: number,
  ) {
    const reportId = await this.reportService.reportUser(me, request);
    return {
      data: { reportId },
      message: '신고가 접수되었습니다.',
    };
  }

  @Post('product')
  @HttpCode(201)
  async reportProduct(
    @Body() request: ReportProductRequest,
    @CurrentUser() me: number,
  ) {
    const reportId = await this.reportService.reportProduct(me, request);
    return {
      data: { reportId },
      message: '신고가 접수되었습니다.',
    };
  }

  @Post('message')
  @HttpCode(201)
  async reportMessage(
    @Body() request: ReportMessageRequest,
    @CurrentUser() me: number,
  ) {
    const reportId = await this.reportService.reportMessage(me, request);
    return {
      data: { reportId },
      message: '신고가 접수되었습니다.',
    };
  }
}
