import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Column, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { ChatRoom } from '../../chat/entities/chat-room.entity';
import { FertilityAction } from '../fertility-action.enum';

// 한 사용자가 같은 거래(채팅)에서 평가를 두 번 하지 못하도록 막는 기록(물 주기/산성비 통합 1회).
@Entity({ name: 'fertility_logs' })
@Unique(['giver', 'chatRoom'])
export class FertilityLog extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'giver_id' })
  giver: User;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;

  @ManyToOne(() => ChatRoom, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_room_id' })
  chatRoom: ChatRoom;

  @Column({ type: 'enum', enum: FertilityAction, nullable: false })
  action: FertilityAction;
}
