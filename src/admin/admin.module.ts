import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ChatMessageRepository } from '../chat/repository/chat-message.repository';
import { ProductModule } from '../product/product.module';
import { Report } from '../report/entities/report.entity';
import { ReportRepository } from '../report/repository/report.repository';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';

import { AdminController } from './controller/admin.controller';
import { AdminGuard } from './guard/admin.guard';
import { AdminService } from './service/admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ChatMessage, Report]),
    ProductModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    UserRepository,
    ChatMessageRepository,
    ReportRepository,
  ],
  exports: [AdminService],
})
export class AdminModule {}
