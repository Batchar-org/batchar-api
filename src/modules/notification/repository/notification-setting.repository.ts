import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationSetting } from '../entities/notification-setting.entity';

@Injectable()
export class NotificationSettingRepository {
  constructor(
    @InjectRepository(NotificationSetting)
    private readonly repository: Repository<NotificationSetting>,
  ) {}

  findByUser(userId: number): Promise<NotificationSetting | null> {
    return this.repository.findOne({ where: { user: { id: userId } } });
  }

  save(setting: NotificationSetting): Promise<NotificationSetting> {
    return this.repository.save(setting);
  }
}
