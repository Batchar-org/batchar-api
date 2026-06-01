import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { AuctionCloseManager } from './auction-close.manager';
import Redis from 'ioredis';

@Injectable()
export class AuctionExpiredListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionExpiredListener.name);
  private subClient: Redis;
  private static readonly AUCTION_KEY_PREFIX = 'auction:';

  constructor(
    private readonly redisService: RedisService,
    private readonly auctionCloseManager: AuctionCloseManager,
  ) {}

  async onModuleInit() {
    try {
      const client = this.redisService.getClient();

      // Redis Keyspace Notification 활성화 시도
      // (로컬 개발 편의를 위해 부팅 시 CONFIG SET을 실행해보되, AWS 등 관리형 Redis의 실패 가능성을 위해 try-catch 처리)
      await client.config('SET', 'notify-keyspace-events', 'Ex').catch((err) => {
        this.logger.warn(`Failed to set CONFIG notify-keyspace-events: ${err.message}. Ensure it is configured on the Redis server.`);
      });

      this.subClient = client.duplicate();

      // 모든 데이터베이스(*)의 expired 이벤트를 리스닝하기 위해 패턴 구독(psubscribe) 적용
      await this.subClient.psubscribe('__keyevent@*__:expired');

      this.subClient.on('pmessage', async (pattern, channel, expiredKey) => {
        try {
          if (!expiredKey.startsWith(AuctionExpiredListener.AUCTION_KEY_PREFIX)) {
            return;
          }

          const productIdStr = expiredKey.substring(AuctionExpiredListener.AUCTION_KEY_PREFIX.length);
          const productId = parseInt(productIdStr, 10);

          this.logger.log(`Received Redis expire event for key="${expiredKey}". Attempting to close auction...`);
          await this.auctionCloseManager.closeAuction(productId);
        } catch (e) {
          this.logger.error(`Failed to handle expire event for key="${expiredKey}"`, e);
        }
      });
    } catch (e) {
      this.logger.error('Failed to initialize Redis Keyspace Notification Listener', e);
    }
  }

  onModuleDestroy() {
    if (this.subClient) {
      this.subClient.disconnect();
      this.logger.log('Disconnected Redis keyspace notification sub client.');
    }
  }
}
