import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { NotificationType, NotificationData } from './notification-type.enum';

/**
 * 인앱 알림함 이력. 푸시 발송 여부와 무관하게(설정 OFF여도) 항상 적재되며, unread-count/배지의 소스가 된다.
 */
@Entity({ name: 'notifications' })
@Index(['user', 'isRead'])
export class Notification extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType, nullable: false })
  type: NotificationType;

  @Column({ nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  body: string;

  @Column({ type: 'json', nullable: true })
  data: NotificationData | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  static create(
    user: User,
    type: NotificationType,
    title: string,
    body: string,
    data: NotificationData | null,
  ): Notification {
    const notification = new Notification();
    notification.user = user;
    notification.type = type;
    notification.title = title;
    notification.body = body;
    notification.data = data;
    notification.isRead = false;
    return notification;
  }

  markAsRead(): void {
    this.isRead = true;
  }
}
