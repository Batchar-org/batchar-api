import './config/load-env'; // .env를 다른 모든 import보다 먼저 로드 (TypeORM forRoot가 process.env를 읽는 시점 문제 회피)
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WsAdapter } from '@nestjs/platform-ws';
import type { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { BusinessException } from './common/exceptions/business.exception';
import { isCorsEnabled, parseCorsOrigins } from './config/cors';

async function bootstrap() {
  // bufferLogs: 커스텀 로거가 준비되기 전의 부팅 로그를 모아뒀다가 한 번에 출력
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false, // 아래에서 직접 등록 (깨진 JSON 에러 매핑)
  });

  // pino 로거를 앱 전역 로거로 지정 → 부팅 로그 + 모든 new Logger() 호출이 pino로 통합됨
  app.useLogger(app.get(Logger));

  // WsAdapter를 이용해 WebSockets을 raw ws 기반으로 띄움 (STOMP 스펙 지원용)
  app.useWebSocketAdapter(new WsAdapter(app));

  // 모바일 앱 API는 항상 최신 JSON이 필요하므로 Express ETag/304 캐시를 사용하지 않는다.
  app.set('etag', false);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // CORS 설정 (관리자 웹과 로컬 개발 서버 허용)
  // nginx 등 앞단 프록시에서 CORS를 처리하는 배포 환경에서는 CORS_ENABLED=false로 비활성화한다.
  if (isCorsEnabled()) {
    app.enableCors({
      origin: parseCorsOrigins(),
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: ['Content-Type', 'Authorization', 'Refresh-Token'],
    });
  } else {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'OPTIONS') {
        return res.status(204).send();
      }
      next();
    });
  }

  // 요청 바디 파서 (Nest 기본값과 동일한 json + urlencoded(extended)).
  // 직접 등록하는 이유: 깨진 JSON의 SyntaxError를 Nest가 일반 BadRequestException으로 바꾸기 전에
  // INVALID_JSON_FORMAT으로 매핑하기 위해. (전역 filter·pipe·interceptor는 AppModule의 APP_* provider)
  app.useBodyParser('json');
  app.use((err: unknown, _req: Request, _res: Response, next: NextFunction) => {
    const isJsonParseError =
      (err as { type?: string } | null)?.type === 'entity.parse.failed';
    next(isJsonParseError ? new BusinessException('INVALID_JSON_FORMAT') : err);
  });
  app.useBodyParser('urlencoded', { extended: true });

  const port = process.env.PORT ?? 18080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
