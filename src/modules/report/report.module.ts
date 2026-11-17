import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { ChatMessageRepository } from '../chat/repository/chat-message.repository';
import { ChatRoomRepository } from '../chat/repository/chat-room.repository';
import { Product } from '../product/entities/product.entity';
import { ProductRepository } from '../product/repository/product.repository';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';

import { ReportController } from './controller/report.controller';
import { Report } from './entities/report.entity';
import { ReportRepository } from './repository/report.repository';
import { ReportService } from './service/report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, User, Product, ChatMessage, ChatRoom]),
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportRepository,
    UserRepository,
    ProductRepository,
    ChatMessageRepository,
    ChatRoomRepository,
  ],
  exports: [ReportService, TypeOrmModule],
})
export class ReportModule {}
