import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRepository } from '../../user/repository/user.repository';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id: number } }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new BusinessException('UNAUTHORIZED');
    }

    const user = await this.userRepository.findById(userId);
    if (!user || !user.isAdmin) {
      throw new BusinessException('ADMIN_FORBIDDEN');
    }
    return true;
  }
}
