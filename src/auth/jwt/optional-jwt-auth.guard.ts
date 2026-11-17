import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    // 토큰이 없거나 만료되어 검증에 실패해도 에러를 내지 않고 통과시킵니다. (req.user = null)
    if (err || !user) {
      return null as TUser;
    }
    return user;
  }
}
