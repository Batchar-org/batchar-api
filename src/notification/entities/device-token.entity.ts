import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

/**
 * 기기별 Expo 푸시 토큰. token은 전역 유니크라 1토큰=1행(=1사용자)을 DB가 보장한다.
 * 같은 물리 기기가 다른 계정으로 재로그인하면 등록 시점에 동일 token을 먼저 제거하여 소유 사용자를 갱신한다.
 */
@Entity({ name: 'device_tokens' })
export class DeviceToken extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  token: string;

  static create(user: User, token: string): DeviceToken {
    const deviceToken = new DeviceToken();
    deviceToken.user = user;
    deviceToken.token = token;
    return deviceToken;
  }
}
