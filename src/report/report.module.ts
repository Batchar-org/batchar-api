import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, User, Product, ChatMessage, ChatRoom]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService, TypeOrmModule],
})
export class ReportModule {}
