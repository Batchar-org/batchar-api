import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Block } from './entities/block.entity';
import { User } from '../user/entities/user.entity';
import { BusinessException } from '../common/exceptions/business.exception';
import { BlockSummary } from './dto/block.dto';

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(Block)
    private readonly blockRepository: Repository<Block>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async blockUser(blockerId: number, blockedId: number): Promise<number> {
    if (Number(blockerId) === Number(blockedId)) {
      throw new BusinessException('SELF_BLOCK_NOT_ALLOWED');
    }

    const blocker = await this.userRepository.findOne({
      where: { id: blockerId },
    });
    if (!blocker) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const blocked = await this.userRepository.findOne({
      where: { id: blockedId },
    });
    if (!blocked) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    const exists = await this.blockRepository.findOne({
      where: { blocker: { id: blockerId }, blocked: { id: blockedId } },
    });
    if (exists) {
      throw new BusinessException('ALREADY_BLOCKED');
    }

    const block = Block.create(blocker, blocked);
    await this.blockRepository.save(block);
    return Number(block.id);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<void> {
    await this.blockRepository.delete({
      blocker: { id: blockerId },
      blocked: { id: blockedId },
    });
  }

  async getBlockList(userId: number): Promise<BlockSummary[]> {
    const blocks = await this.blockRepository.find({
      where: { blocker: { id: userId } },
      relations: { blocked: true },
      order: { createdAt: 'DESC' },
    });

    return blocks.map((b) => ({
      blockId: Number(b.id),
      blockedId: Number(b.blocked.id),
      blockedName: b.blocked.name,
      blockedProfileImageUrl: b.blocked.profileImageUrl,
      createdAt: b.createdAt,
    }));
  }

  // is_blocked(a, b): 양방향 차단 관계 여부
  async isBlocked(a: number | null, b: number | null): Promise<boolean> {
    if (a == null || b == null) {
      return false;
    }
    const count = await this.blockRepository.count({
      where: [
        { blocker: { id: a }, blocked: { id: b } },
        { blocker: { id: b }, blocked: { id: a } },
      ],
    });
    return count > 0;
  }

  // userId와 차단 관계(양방향)인 모든 상대 사용자 ID 목록 — 목록 필터링용
  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blocks = await this.blockRepository.find({
      where: [{ blocker: { id: userId } }, { blocked: { id: userId } }],
      relations: { blocker: true, blocked: true },
    });

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
    const iBlocked = await this.blockRepository.exists({
      where: { blocker: { id: userId }, blocked: { id: partnerId } },
    });
    const blockedByPartner = await this.blockRepository.exists({
      where: { blocker: { id: partnerId }, blocked: { id: userId } },
    });
    return { iBlocked, blockedByPartner };
  }
}
