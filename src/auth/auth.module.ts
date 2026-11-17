import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailModule } from '../common/email/email.module';
import { RedisModule } from '../common/redis/redis.module';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';
import { UserModule } from '../user/user.module';

import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { RefreshTokenService } from './service/refresh-token.service';
import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => UserModule),
    EmailModule,
    RedisModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret:
          process.env.JWT_SECRET ||
          'super-secret-key-please-change-in-production-environments-for-security',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, JwtStrategy, UserRepository],
  exports: [AuthService, RefreshTokenService, JwtStrategy, JwtModule],
})
export class AuthModule {}
