import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case.interceptor';
import { NumericParamPipe } from './common/pipes/numeric-param.pipe';
import { EmailModule } from './infra/email/email.module';
import { LoggerConfigModule } from './infra/logger/logger.module';
import { RedisModule } from './infra/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuctionModule } from './modules/auction/auction.module';
import { AuthModule } from './modules/auth/auth.module';
import { BidModule } from './modules/bid/bid.module';
import { BlockModule } from './modules/block/block.module';
import { ChatModule } from './modules/chat/chat.module';
import { FertilityModule } from './modules/fertility/fertility.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ProductModule } from './modules/product/product.module';
import { ReportModule } from './modules/report/report.module';
import { StorageApiModule } from './modules/storage/storage-api.module';
import { UserModule } from './modules/user/user.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { WishModule } from './modules/wish/wish.module';

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
    StorageApiModule,
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
  providers: [
    AppService,
    // 전역 요청 처리 파이프라인. main.ts가 아닌 여기서 등록해야 e2e 테스트(Test.createTestingModule)에도 똑같이 적용된다.
    // 실행 순서: Interceptor(요청 키 camelCase 변환) → Pipe(등록 순서대로) → Handler → Interceptor(응답 snake_case) / 예외는 Filter.
    { provide: APP_INTERCEPTOR, useClass: SnakeCaseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // NumericParamPipe가 ValidationPipe보다 먼저 와야 원본 문자열을 검사할 수 있다.
    { provide: APP_PIPE, useClass: NumericParamPipe },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ transform: true, whitelist: true }),
    },
  ],
})
export class AppModule {}
