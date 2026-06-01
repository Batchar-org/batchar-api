import { Injectable } from '@nestjs/common';
import { RedisService } from '../common/redis/redis.service';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class RefreshTokenService {
  private static readonly PREFIX = 'rt:';

  constructor(private readonly redisService: RedisService) {}

  async save(refreshToken: string, userId: number, expirationMs: number): Promise<void> {
    await this.redisService.setMs(
      RefreshTokenService.PREFIX + refreshToken,
      String(userId),
      expirationMs,
    );
  }

  async getUserId(refreshToken: string): Promise<number> {
    const userIdStr = await this.redisService.get(RefreshTokenService.PREFIX + refreshToken);
    if (!userIdStr) {
      throw new BusinessException('INVALID_TOKEN');
    }
    return parseInt(userIdStr, 10);
  }

  async delete(refreshToken: string): Promise<void> {
    await this.redisService.delete(RefreshTokenService.PREFIX + refreshToken);
  }
}
