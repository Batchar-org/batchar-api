import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'chat_message' })
export class ChatMessage extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => ChatRoom, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: ChatRoom;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  static createMessage(
    chat: ChatRoom,
    sender: User,
    message: string,
  ): ChatMessage {
    const cm = new ChatMessage();
    cm.chat = chat;
    cm.sender = sender;
    cm.message = message;
    cm.isRead = false;
    return cm;
  }

  markAsRead(): void {
    this.isRead = true;
  }
}
