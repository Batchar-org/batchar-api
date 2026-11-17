import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { ReportService } from './service/report.service';
import { ReportController } from './controller/report.controller';
import { ReportRepository } from './repository/report.repository';
import { UserRepository } from '../user/repository/user.repository';
import { ProductRepository } from '../product/repository/product.repository';
import { ChatMessageRepository } from '../chat/repository/chat-message.repository';
import { ChatRoomRepository } from '../chat/repository/chat-room.repository';

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
