import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  RegisterDeviceTokenRequest,
  NotificationListRequest,
  UpdateNotificationSettingRequest,
} from './dto/notification.dto';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('device-tokens')
  @HttpCode(201)
  async registerDeviceToken(
    @CurrentUser() userId: number,
    @Body() request: RegisterDeviceTokenRequest,
  ) {
    await this.notificationService.registerDeviceToken(userId, request.token);
    return { data: null, message: '디바이스 토큰을 등록했습니다.' };
  }

  // 토큰은 query param으로 받는다. (일부 HTTP 클라이언트가 DELETE 바디를 누락시키는 문제 회피)
  @Delete('device-tokens')
  @HttpCode(200)
  async removeDeviceToken(
    @CurrentUser() userId: number,
    @Query('token') token: string,
  ) {
    await this.notificationService.removeDeviceToken(userId, token);
    return { data: null, message: '디바이스 토큰을 해제했습니다.' };
  }

  @Get()
  @HttpCode(200)
  async getNotifications(
    @CurrentUser() userId: number,
    @Query() request: NotificationListRequest,
  ) {
    const data = await this.notificationService.getNotifications(
      userId,
      request,
    );
    return { data, message: '알림 목록을 조회했습니다.' };
  }

  @Get('unread-count')
  @HttpCode(200)
  async getUnreadCount(@CurrentUser() userId: number) {
    const data = await this.notificationService.getUnreadCount(userId);
    return { data, message: '안 읽은 알림 수를 조회했습니다.' };
  }

  @Patch('read-all')
  @HttpCode(200)
  async markAllAsRead(@CurrentUser() userId: number) {
    await this.notificationService.markAllAsRead(userId);
    return { data: null, message: '모든 알림을 읽음 처리했습니다.' };
  }

  @Patch(':notificationId/read')
  @HttpCode(200)
  async markAsRead(
    @CurrentUser() userId: number,
    @Param('notificationId') notificationId: number,
  ) {
    await this.notificationService.markAsRead(userId, Number(notificationId));
    return { data: null, message: '알림을 읽음 처리했습니다.' };
  }

  @Get('settings')
  @HttpCode(200)
  async getSetting(@CurrentUser() userId: number) {
    const data = await this.notificationService.getSetting(userId);
    return { data, message: '알림 설정을 조회했습니다.' };
  }

  @Patch('settings')
  @HttpCode(200)
  async updateSetting(
    @CurrentUser() userId: number,
    @Body() request: UpdateNotificationSettingRequest,
  ) {
    const data = await this.notificationService.updateSetting(
      userId,
      request.pushEnabled,
    );
    return { data, message: '알림 설정을 변경했습니다.' };
  }

  // device-tokens 등 리터럴 DELETE 라우트보다 뒤에 선언해야 :notificationId가 가로채지 않는다.
  @Delete(':notificationId')
  @HttpCode(200)
  async deleteNotification(
    @CurrentUser() userId: number,
    @Param('notificationId') notificationId: number,
  ) {
    await this.notificationService.deleteNotification(
      userId,
      Number(notificationId),
    );
    return { data: null, message: '알림을 삭제했습니다.' };
  }

  @Delete()
  @HttpCode(200)
  async deleteAllNotifications(@CurrentUser() userId: number) {
    await this.notificationService.deleteAllNotifications(userId);
    return { data: null, message: '모든 알림을 삭제했습니다.' };
  }
}
