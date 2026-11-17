import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

import { BusinessException } from '../../common/exceptions/business.exception';
import { UserRepository } from '../../user/repository/user.repository';

import { BlockSummary } from '../dto/block-summary.dto';
import { Block } from '../entities/block.entity';
import { BlockRepository } from '../repository/block.repository';

@Injectable()
export class BlockService {
  constructor(
    private readonly blockRepository: BlockRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async blockUser(blockerId: number, blockedId: number): Promise<number> {
    if (Number(blockerId) === Number(blockedId)) {
      throw new BusinessException('SELF_BLOCK_NOT_ALLOWED');
    }

    const blocker = await this.userRepository.findById(blockerId);
    if (!blocker) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const blocked = await this.userRepository.findById(blockedId);
    if (!blocked) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const exists = await this.blockRepository.findByPair(blockerId, blockedId);
    if (exists) {
      throw new BusinessException('ALREADY_BLOCKED');
    }

    const block = Block.create(blocker, blocked);
    await this.blockRepository.save(block);
    return Number(block.id);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    await this.blockRepository.deleteByPair(blockerId, blockedId);
  }

  async getBlockList(userId: number): Promise<BlockSummary[]> {
    const blocks =
      await this.blockRepository.findAllByBlockerWithBlocked(userId);

    return blocks.map((b) => ({
      blockId: Number(b.id),
      blockedId: Number(b.blocked.id),
      blockedName: b.blocked.name,
      blockedProfileImageUrl: b.blocked.profileImageUrl,
      createdAt: b.createdAt,
    }));
  }

  // is_blocked(a, b): 양방향 차단 관계 여부
  // 트랜잭션 안에서 호출할 때는 manager를 넘겨 같은 커넥션으로 조회한다.
  // (풀에서 커넥션을 하나 더 꺼내면, 락 대기자들이 풀을 다 쥐고 있을 때 교착이 생김)
  async isBlocked(
    a: number | null,
    b: number | null,
    manager?: EntityManager,
  ): Promise<boolean> {
    if (a == null || b == null) {
      return false;
    }
    const count = await this.blockRepository.countBetween(a, b, manager);
    return count > 0;
  }

  // userId와 차단 관계(양방향)인 모든 상대 사용자 ID 목록 — 목록 필터링용
  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blocks = await this.blockRepository.findAllInvolving(userId);

    const ids = new Set<number>();
    for (const b of blocks) {
      const otherId =
        Number(b.blocker.id) === Number(userId)
          ? Number(b.blocked.id)
          : Number(b.blocker.id);
      ids.add(otherId);
    }
    return Array.from(ids);
  }

  // 방향별 차단 여부 — 채팅 목록 enrich용
  async getBlockDirection(
    userId: number,
    partnerId: number,
  ): Promise<{ iBlocked: boolean; blockedByPartner: boolean }> {
    const iBlocked = await this.blockRepository.existsByPair(userId, partnerId);
    const blockedByPartner = await this.blockRepository.existsByPair(
      partnerId,
      userId,
    );
    return { iBlocked, blockedByPartner };
  }
}
