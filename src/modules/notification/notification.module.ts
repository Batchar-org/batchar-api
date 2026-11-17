import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';

import { NotificationController } from './controller/notification.controller';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { Notification } from './entities/notification.entity';
import { DeviceTokenRepository } from './repository/device-token.repository';
import { NotificationSettingRepository } from './repository/notification-setting.repository';
import { NotificationRepository } from './repository/notification.repository';
import { ExpoPushService } from './service/expo-push.service';
import { NotificationService } from './service/notification.service';

/**
 * 알림은 bid/auction/chat/admin 등 다수 도메인에서 호출하는 횡단 관심사이며,
 * 역으로 그 도메인들에 의존하지 않아 순환참조가 없으므로 @Global로 제공한다(RedisModule과 동일 전략).
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      Notification,
      NotificationSetting,
      User,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    ExpoPushService,
    DeviceTokenRepository,
    NotificationRepository,
    NotificationSettingRepository,
    UserRepository,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
