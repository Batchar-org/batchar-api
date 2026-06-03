import './load-env'; // .env를 다른 모든 import보다 먼저 로드 (TypeORM forRoot가 process.env를 읽는 시점 문제 회피)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SnakeCaseInterceptor } from './common/interceptors/snake-case.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WsAdapter } from '@nestjs/platform-ws';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

async function bootstrap() {
  // bufferLogs: 커스텀 로거가 준비되기 전의 부팅 로그를 모아뒀다가 한 번에 출력
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  // pino 로거를 앱 전역 로거로 지정 → 부팅 로그 + 모든 new Logger() 호출이 pino로 통합됨
  app.useLogger(app.get(Logger));

  // WsAdapter를 이용해 WebSockets을 raw ws 기반으로 띄움 (STOMP 스펙 지원용)
  app.useWebSocketAdapter(new WsAdapter(app));

  // 모바일 앱 API는 항상 최신 JSON이 필요하므로 Express ETag/304 캐시를 사용하지 않는다.
  app.set('etag', false);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

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
