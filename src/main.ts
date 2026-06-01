import './load-env'; // .env를 다른 모든 import보다 먼저 로드 (TypeORM forRoot가 process.env를 읽는 시점 문제 회피)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // WsAdapter를 이용해 WebSockets을 raw ws 기반으로 띄움 (STOMP 스펙 지원용)
  app.useWebSocketAdapter(new WsAdapter(app));

  // CORS 설정 (Spring Security와 동일한 패턴 매핑)
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  });

  // 글로벌 인터셉터 / 필터 / 검증 파이프 등록
  app.useGlobalInterceptors(new SnakeCaseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const port = process.env.PORT ?? 18080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();

