import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';

@Injectable()
export class DeviceTokenRepository {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly repository: Repository<DeviceToken>,
  ) {}

  findAllByUser(userId: number): Promise<DeviceToken[]> {
    return this.repository.find({ where: { user: { id: userId } } });
  }

  save(deviceToken: DeviceToken): Promise<DeviceToken> {
    return this.repository.save(deviceToken);
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repository.delete({ token });
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    await this.repository.delete({ token: In(tokens) });
  }

  async deleteByUserAndToken(userId: number, token: string): Promise<void> {
    await this.repository.delete({ user: { id: userId }, token });
  }
}
