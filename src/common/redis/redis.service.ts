import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.logger.log(`Connecting to Redis at ${host}:${port}...`);
    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        // 재연결 대기 시간 설정
        return Math.min(times * 50, 2000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Successfully connected to Redis.');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.logger.log('Disconnected from Redis.');
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async setMs(key: string, value: string, ttlMs: number): Promise<string> {
    return this.client.set(key, value, 'PX', ttlMs);
  }

  async delete(key: string): Promise<number> {
    return this.client.del(key);
  }
}
