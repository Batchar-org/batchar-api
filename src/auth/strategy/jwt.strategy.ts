import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { User } from '../../user/entities/user.entity';

type JwtPayload = {
  sub: string;
  tokenVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET ||
        'super-secret-key-please-change-in-production-environments-for-security',
    });
  }

  async validate(payload: JwtPayload) {
    // Spring Boot의 subject인 userId를 매핑
    const user = await this.userRepository.findOne({
      where: { id: Number(payload.sub) },
    });

    if (!user) {
      throw new BusinessException('INVALID_TOKEN');
    }

    if (user.isSuspended()) {
      throw new BusinessException('USER_SUSPENDED', {
        suspended_until: user.suspendedUntil?.toISOString(),
        remaining_seconds: user.getSuspensionRemainingSeconds(),
      });
    }

    if (user.withdrawnAt || payload.tokenVersion !== user.tokenVersion) {
      throw new BusinessException('INVALID_TOKEN');
    }

    return { id: Number(user.id) };
  }
}
