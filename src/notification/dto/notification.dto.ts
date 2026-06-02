import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Notification } from '../entities/notification.entity';
import {
  NotificationType,
  NotificationData,
} from '../entities/notification-type.enum';

export class RegisterDeviceTokenRequest {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class NotificationListRequest {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  page: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  size: number = 20;
}

export class UpdateNotificationSettingRequest {
  @IsBoolean()
  @IsNotEmpty()
  pushEnabled: boolean;
}

export class NotificationResponse {
  id: number;

  type: NotificationType;

  title: string;

  body: string;

  data: NotificationData | null;

  isRead: boolean;

  createdAt: Date;

  static from(notification: Notification): NotificationResponse {
    return {
      id: Number(notification.id),
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
