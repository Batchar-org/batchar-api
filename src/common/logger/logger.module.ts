import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

// express가 붙이는 필드 + 인증 가드가 넣는 user (pino-http는 IncomingMessage로만 타입을 줌)
type AppRequest = IncomingMessage & {
  user?: { id: number };
  originalUrl?: string;
};

const isProd = process.env.NODE_ENV === 'production';

// 사람이 읽기 좋은 pretty 포맷을 쓸지 여부.
// - 로컬(개발)에서는 기본 pretty.
// - 운영 이미지는 NODE_ENV=production이라 JSON이지만, 도커로 로컬 구동할 때
//   LOG_PRETTY=true를 주면 컨테이너 로그(docker logs)도 pretty로 볼 수 있다.
const prettyLogs = !isProd || process.env.LOG_PRETTY === 'true';

const logLevel = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

// 파일 로그 디렉터리. 미지정이면 stdout만 (로컬 개발·테스트에서 파일이 쌓이지 않게).
const logDir = process.env.LOG_DIR;

/**
 * 전역 HTTP 요청 로깅 설정 (nestjs-pino 기반).
 * - 요청마다 고유 ID(request id)를 만들어 응답의 `X-Request-Id` 헤더로 내려준다.
 *   프론트엔드는 이 값만 공유하면 백엔드 로그에서 해당 요청 흐름을 바로 찾을 수 있다.
 * - 요청 1건 = 로그 1줄(메서드/경로/상태코드/소요시간/유저ID)로 자동 기록.
 * - 개발 환경: 사람이 읽기 좋은 한 줄 포맷, 운영 환경: 수집/검색이 쉬운 JSON.
 *
 * 보안: serializer 화이트리스트로 로그에 남길 필드를 제한한다. 요청 헤더(Authorization 등)·
 * 요청 바디(password 등)·에러 객체의 커스텀 속성은 애초에 기록되지 않으므로 별도 redact가 필요 없다.
 * (단, 에러 stack '문자열' 안에 우연히 들어간 민감 값까지는 막지 못한다 — 알려진 한계.)
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: logLevel,

        // 시간을 epoch ms 대신 KST ISO 문자열로 (예: 2026-11-17T21:55:42.028+09:00).
        // ponytail: +09:00 고정 — 한국은 DST가 없어 TZ 설정과 무관하게 정확. 다른 시간대 운영 시 교체.
        timestamp: () =>
          `,"time":"${new Date(Date.now() + 9 * 3600_000).toISOString().replace('Z', '+09:00')}"`,

        // 헬스체크(GET /)는 도커가 10초마다 호출 → 로그를 도배하므로 기록에서 제외.
        autoLogging: {
          ignore: (req) => req.url === '/',
        },

        // 요청 ID: 외부에서 X-Request-Id를 주면(형식 검증 후) 그대로 쓰고, 없으면 새로 발급.
        // 발급한 ID를 응답 헤더에 실어 프론트엔드가 확인할 수 있게 한다.
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
          // 외부 입력은 형식이 맞을 때만 신뢰 (헤더/로그 변조 방지). 아니면 새로 발급.
          const id =
            candidate && /^[A-Za-z0-9._-]{1,128}$/.test(candidate)
              ? candidate
              : randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },

        // 인증된 요청이면 누가 보냈는지(userId)도 함께 기록.
        customProps: (req) => ({
          userId: (req as AppRequest).user?.id,
        }),

        // 상태코드에 따라 로그 레벨 자동 분기 (4xx=warn, 5xx/에러=error).
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },

        // 로그 한 줄에 보이는 메시지 (예: "POST /api/auth/login 200").
        customSuccessMessage: (req, res) =>
          `${req.method} ${(req as AppRequest).originalUrl ?? req.url} ${res.statusCode}`,
        customErrorMessage: (req, res) =>
          `${req.method} ${(req as AppRequest).originalUrl ?? req.url} ${res.statusCode}`,

        // 로그에 남길 필드를 화이트리스트로 제한 (헤더 전체·바디·에러 커스텀 속성 등 노이즈/민감정보 차단).
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
          err: (err: Error & { type?: string }) => ({
            type: err.type ?? err.name,
            message: err.message,
            stack: err.stack,
          }),
        },

        // stdout: pretty(컬러·한 줄) 또는 JSON.
        // LOG_DIR 지정 시 파일에도 JSON으로 기록 → `tail -F $LOG_DIR/current.log | grep POST`.
        // 파일은 일 단위 + 50MB 단위로 교체하고 최근 14개만 보관 (디스크 고갈 방지).
        transport: {
          targets: [
            prettyLogs
              ? {
                  target: 'pino-pretty',
                  level: logLevel,
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                  },
                }
              : { target: 'pino/file', level: logLevel, options: {} },
            ...(logDir
              ? [
                  {
                    target: 'pino-roll',
                    level: logLevel,
                    options: {
                      file: join(logDir, 'app'),
                      extension: '.log',
                      dateFormat: 'yyyy-MM-dd',
                      frequency: 'daily',
                      size: '50m',
                      limit: { count: 14 },
                      symlink: true,
                      mkdir: true,
                    },
                  },
                ]
              : []),
          ],
        },
      },
    }),
  ],
})
export class LoggerConfigModule {}
