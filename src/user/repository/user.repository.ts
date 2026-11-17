import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<User> {
    return manager ? manager.getRepository(User) : this.repository;
  }

  findById(id: number, manager?: EntityManager): Promise<User | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  // 동시성 안전을 위해 행을 잠그고 읽는다 (트랜잭션 전용)
  findByIdForUpdate(id: number, manager: EntityManager): Promise<User | null> {
    return this.repo(manager).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  existsById(id: number): Promise<boolean> {
    return this.repo().exists({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo().findOne({ where: { email } });
  }

  findByName(name: string): Promise<User | null> {
    return this.repo().findOne({ where: { name } });
  }

  findAdmins(): Promise<User[]> {
    return this.repo().find({ where: { isAdmin: true } });
  }

  save(user: User, manager?: EntityManager): Promise<User> {
    return this.repo(manager).save(user);
  }
}
