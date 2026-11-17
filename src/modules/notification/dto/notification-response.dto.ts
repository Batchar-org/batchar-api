import { Notification } from '../entities/notification.entity';
import {
  NotificationType,
  NotificationData,
} from '../enum/notification-type.enum';

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
