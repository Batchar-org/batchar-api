import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, Repository } from 'typeorm';

import { FertilityLog } from '../entities/fertility-log.entity';

@Injectable()
export class FertilityLogRepository {
  constructor(
    @InjectRepository(FertilityLog)
    private readonly repository: Repository<FertilityLog>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<FertilityLog> {
    return manager ? manager.getRepository(FertilityLog) : this.repository;
  }

  findByGiverAndChat(
    giverId: number,
    chatId: number,
    manager?: EntityManager,
  ): Promise<FertilityLog | null> {
    return this.repo(manager).findOne({
      where: { giver: { id: giverId }, chatRoom: { id: chatId } },
    });
  }

  create(
    data: DeepPartial<FertilityLog>,
    manager?: EntityManager,
  ): FertilityLog {
    return this.repo(manager).create(data);
  }

  save(log: FertilityLog, manager?: EntityManager): Promise<FertilityLog> {
    return this.repo(manager).save(log);
  }
}
