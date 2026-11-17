import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { Block } from '../entities/block.entity';

@Injectable()
export class BlockRepository {
  constructor(
    @InjectRepository(Block)
    private readonly repository: Repository<Block>,
  ) {}

  // 트랜잭션 안에서는 manager를 넘겨 같은 커넥션으로 실행한다.
  private repo(manager?: EntityManager): Repository<Block> {
    return manager ? manager.getRepository(Block) : this.repository;
  }

  findByPair(blockerId: number, blockedId: number): Promise<Block | null> {
    return this.repo().findOne({
      where: { blocker: { id: blockerId }, blocked: { id: blockedId } },
    });
  }

  existsByPair(blockerId: number, blockedId: number): Promise<boolean> {
    return this.repo().exists({
      where: { blocker: { id: blockerId }, blocked: { id: blockedId } },
    });
  }

  // 양방향 차단 관계 수
  countBetween(a: number, b: number, manager?: EntityManager): Promise<number> {
    return this.repo(manager).count({
      where: [
        { blocker: { id: a }, blocked: { id: b } },
        { blocker: { id: b }, blocked: { id: a } },
      ],
    });
  }

  findAllByBlockerWithBlocked(blockerId: number): Promise<Block[]> {
    return this.repo().find({
      where: { blocker: { id: blockerId } },
      relations: { blocked: true },
      order: { createdAt: 'DESC' },
    });
  }

  // userId가 차단했거나 차단당한 모든 관계
  findAllInvolving(userId: number): Promise<Block[]> {
    return this.repo().find({
      where: [{ blocker: { id: userId } }, { blocked: { id: userId } }],
      relations: { blocker: true, blocked: true },
    });
  }

  save(block: Block): Promise<Block> {
    return this.repo().save(block);
  }

  async deleteByPair(blockerId: number, blockedId: number): Promise<void> {
    await this.repo().delete({
      blocker: { id: blockerId },
      blocked: { id: blockedId },
    });
  }
}
