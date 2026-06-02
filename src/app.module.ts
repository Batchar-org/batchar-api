import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './common/redis/redis.module';
import { StorageModule } from './common/storage/storage.module';
import { EmailModule } from './common/email/email.module';
import { NotificationModule } from './notification/notification.module';
import { AuctionModule } from './auction/auction.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductModule } from './product/product.module';
import { WishModule } from './wish/wish.module';
import { BidModule } from './bid/bid.module';
import { ChatModule } from './chat/chat.module';
import { WebSocketModule } from './websocket/websocket.module';
import { BlockModule } from './block/block.module';
import { ReportModule } from './report/report.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306', 10),
      username: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'test',
      autoLoadEntities: true,
      synchronize: true, // Spring Boot의 JPA ddl-auto: update 전략과 매핑
      timezone: '+09:00', // 한국 표준시(KST) 타임존 설정
    }),
    ScheduleModule.forRoot(), // 스케줄러 기능 활성화
    RedisModule,
    StorageModule,
    EmailModule,
    NotificationModule,
    AuctionModule,
    AuthModule,
    UserModule,
    ProductModule,
    WishModule,
    BidModule,
    ChatModule,
    WebSocketModule,
    BlockModule,
    ReportModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
