import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

/**
 * 사용자별 알림 설정. v1은 푸시 전체 on/off 마스터 스위치 하나만 둔다.
 * (종류별 토글/야간 방해금지는 범위에서 제외 — iOS 집중모드에 위임)
 * 행이 없으면 기본값(push_enabled=true)으로 간주한다.
 */
@Entity({ name: 'notification_settings' })
export class NotificationSetting extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  static create(user: User, pushEnabled: boolean): NotificationSetting {
    const setting = new NotificationSetting();
    setting.user = user;
    setting.pushEnabled = pushEnabled;
    return setting;
  }
}
