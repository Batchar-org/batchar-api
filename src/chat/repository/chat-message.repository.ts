import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { ChatMessage } from '../entities/chat-message.entity';

@Injectable()
export class ChatMessageRepository {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly repository: Repository<ChatMessage>,
  ) {}

  findLatestByChat(chatId: number): Promise<ChatMessage | null> {
    return this.repository.findOne({
      where: { chat: { id: chatId } },
      order: { createdAt: 'DESC' },
    });
  }

  // 발신자 포함, 오래된 순
  findAllByChatWithSender(chatId: number): Promise<ChatMessage[]> {
    return this.repository.find({
      where: { chat: { id: chatId } },
      relations: { sender: true },
      order: { createdAt: 'ASC' },
    });
  }

  // 발신자와 채팅방(판매자/구매자) 포함
  findByIdWithSenderAndChat(id: number): Promise<ChatMessage | null> {
    return this.repository.findOne({
      where: { id },
      relations: { sender: true, chat: { seller: true, buyer: true } },
    });
  }

  // readerId가 아직 읽지 않은 상대방 메시지 수
  countUnread(chatId: number, readerId: number): Promise<number> {
    return this.repository.count({
      where: {
        chat: { id: chatId },
        sender: { id: Not(readerId) },
        isRead: false,
      },
    });
  }

  save(message: ChatMessage): Promise<ChatMessage> {
    return this.repository.save(message);
  }

  saveAll(messages: ChatMessage[]): Promise<ChatMessage[]> {
    return this.repository.save(messages);
  }

  async deleteAllByChat(chatId: number): Promise<void> {
    await this.repository.delete({ chat: { id: chatId } });
  }
}
