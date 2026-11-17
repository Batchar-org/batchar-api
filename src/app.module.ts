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
import { FertilityModule } from './fertility/fertility.module';
import { LoggerConfigModule } from './common/logger/logger.module';

@Module({
  imports: [
    LoggerConfigModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DB || 'test',
      autoLoadEntities: true,
      synchronize: true, // Spring Boot의 JPA ddl-auto: update 전략과 매핑
      // 락을 5초 넘게 기다리면 실패시킨다. PostgreSQL 기본값은 무제한이라,
      // 교착이 생기면 서버 전체가 멈춘다. (MySQL은 innodb_lock_wait_timeout 50초가 같은 역할)
      extra: { options: '-c lock_timeout=5000' },
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
    FertilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
