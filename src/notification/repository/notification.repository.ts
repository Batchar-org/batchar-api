import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  findPageByUser(
    userId: number,
    skip: number,
    take: number,
  ): Promise<Notification[]> {
    return this.repository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  countUnreadByUser(userId: number): Promise<number> {
    return this.repository.count({
      where: { user: { id: userId }, isRead: false },
    });
  }

  // 반영된 행 수를 반환한다 (0이면 대상 없음)
  async markAsRead(id: number, userId: number): Promise<number> {
    const result = await this.repository.update(
      { id, user: { id: userId } },
      { isRead: true },
    );
    return result.affected ?? 0;
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.repository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }

  // 삭제된 행 수를 반환한다 (0이면 대상 없음)
  async deleteByIdAndUser(id: number, userId: number): Promise<number> {
    const result = await this.repository.delete({ id, user: { id: userId } });
    return result.affected ?? 0;
  }

  async deleteAllByUser(userId: number): Promise<void> {
    await this.repository.delete({ user: { id: userId } });
  }

  save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }
}
