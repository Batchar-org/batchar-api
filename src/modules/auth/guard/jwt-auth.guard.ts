import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { BusinessException } from '../../../common/exceptions/business.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    if (err || !user) {
      throw new BusinessException('UNAUTHORIZED');
    }
    return user;
  }
}
