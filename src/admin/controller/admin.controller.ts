import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  HttpCode,
  Delete,
} from '@nestjs/common';
import { AdminService } from '../service/admin.service';
import { AdminGuard } from '../guard/admin.guard';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth.guard';
import { ReportListRequest } from '../dto/report-list-request.dto';
import { ResolveReportRequest } from '../dto/resolve-report-request.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users/:userId/suspend')
  @HttpCode(200)
  async suspendUser(@Param('userId') userId: number) {
    await this.adminService.suspendUser(Number(userId));
    return { data: null, message: '사용자를 정지했습니다.' };
  }

  @Post('users/:userId/unsuspend')
  @HttpCode(200)
  async unsuspendUser(@Param('userId') userId: number) {
    await this.adminService.unsuspendUser(Number(userId));
    return { data: null, message: '사용자의 정지를 해제했습니다.' };
  }

  @Delete('products/:productId')
  @HttpCode(200)
  async deleteProduct(@Param('productId') productId: number) {
    await this.adminService.deleteProduct(Number(productId));
    return { data: null, message: '상품을 삭제했습니다.' };
  }

  @Get('reports')
  @HttpCode(200)
  async listReports(@Query() request: ReportListRequest) {
    const data = await this.adminService.listReports(request);
    return { data, message: '신고 목록을 조회했습니다.' };
  }

  @Get('reports/:reportId')
  @HttpCode(200)
  async getReportDetail(@Param('reportId') reportId: number) {
    const data = await this.adminService.getReportDetail(Number(reportId));
    return { data, message: '신고 상세를 조회했습니다.' };
  }

  @Post('reports/:reportId/resolve')
  @HttpCode(200)
  async resolveReport(
    @Param('reportId') reportId: number,
    @Body() request: ResolveReportRequest,
  ) {
    await this.adminService.resolveReport(Number(reportId), request);
    return { data: null, message: '신고를 처리했습니다.' };
  }
}
