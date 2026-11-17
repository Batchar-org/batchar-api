# syntax=docker/dockerfile:1

# ============================================================
# 1) builder 스테이지 — 의존성 설치 + TypeScript 빌드
# ============================================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# bcrypt 등 네이티브 모듈 컴파일에 필요한 빌드 도구
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# 패키지 매니저는 bun (런타임은 node 유지) — 로컬과 동일한 버전의 바이너리만 복사
COPY --from=oven/bun:1.3.14 /usr/local/bin/bun /usr/local/bin/bun

# package.json 먼저 복사 → 의존성 레이어 캐싱 (소스만 바뀌면 install 재실행 안 함)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 소스 복사 후 빌드 → dist/ 생성, 이어서 개발 의존성 제거(prod만 남김)
COPY . .
# bun엔 prune이 없어 node_modules를 지우고 prod 의존성만 재설치
RUN bun run build \
    && rm -rf node_modules \
    && bun install --frozen-lockfile --production

# ============================================================
# 2) runtime 스테이지 — 실행에 필요한 것만 복사
# ============================================================
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# builder에서 만들어진 결과물만 가져옴 (빌드 도구 없음 → 가벼움)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

EXPOSE 18080

# 컨테이너 자체 헬스체크: GET / 가 200이면 healthy
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
  CMD node -e "require('http').get('http://localhost:18080/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main"]
