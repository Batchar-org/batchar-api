import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { ChatRoom } from '../entities/chat-room.entity';

@Injectable()
export class ChatRoomRepository {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly repository: Repository<ChatRoom>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<ChatRoom> {
    return manager ? manager.getRepository(ChatRoom) : this.repository;
  }

  // 판매자/구매자 포함
  findByIdWithParticipants(
    id: number,
    manager?: EntityManager,
  ): Promise<ChatRoom | null> {
    return this.repo(manager).findOne({
      where: { id },
      relations: { seller: true, buyer: true },
    });
  }

  // 판매자/구매자/상품 포함
  findByIdWithParticipantsAndProduct(id: number): Promise<ChatRoom | null> {
    return this.repo().findOne({
      where: { id },
      relations: { seller: true, buyer: true, product: true },
    });
  }

  // 사용자가 나가지 않은 채팅방 목록
  findActiveByUser(userId: number): Promise<ChatRoom[]> {
    return this.repo().find({
      where: [
        { seller: { id: userId }, sellerDeleted: false },
        { buyer: { id: userId }, buyerDeleted: false },
      ],
      relations: { seller: true, buyer: true, product: true },
    });
  }

  save(chatRoom: ChatRoom, manager?: EntityManager): Promise<ChatRoom> {
    return this.repo(manager).save(chatRoom);
  }

  async remove(chatRoom: ChatRoom): Promise<void> {
    await this.repo().remove(chatRoom);
  }
}
