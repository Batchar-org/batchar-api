import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { Report } from '../report/entities/report.entity';
import { AdminService } from './service/admin.service';
import { AdminController } from './controller/admin.controller';
import { AdminGuard } from './guard/admin.guard';
import { ProductModule } from '../product/product.module';
import { UserRepository } from '../user/repository/user.repository';
import { ChatMessageRepository } from '../chat/repository/chat-message.repository';
import { ReportRepository } from '../report/repository/report.repository';

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
