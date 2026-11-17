import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BlockModule } from '../block/block.module';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { ChatRoomRepository } from '../chat/repository/chat-room.repository';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';

import { FertilityController } from './controller/fertility.controller';
import { FertilityLog } from './entities/fertility-log.entity';
import { FertilityLogRepository } from './repository/fertility-log.repository';
import { FertilityService } from './service/fertility.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FertilityLog, ChatRoom, User]),
    BlockModule,
  ],
  controllers: [FertilityController],
  providers: [
    FertilityService,
    FertilityLogRepository,
    ChatRoomRepository,
    UserRepository,
  ],
})
export class FertilityModule {}
