import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FertilityLog } from './entities/fertility-log.entity';
import { FertilityService } from './service/fertility.service';
import { FertilityController } from './controller/fertility.controller';
import { BlockModule } from '../block/block.module';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { FertilityLogRepository } from './repository/fertility-log.repository';
import { ChatRoomRepository } from '../chat/repository/chat-room.repository';
import { UserRepository } from '../user/repository/user.repository';

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
