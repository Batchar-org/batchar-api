import { Body, Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ReportMessageRequest,
  ReportProductRequest,
  ReportUserRequest,
} from './dto/report.dto';

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
