import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { BusinessException } from '../common/exceptions/business.exception';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) {
      throw new BusinessException('UNAUTHORIZED');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.isAdmin) {
      throw new BusinessException('ADMIN_FORBIDDEN');
    }
    return true;
  }
}
