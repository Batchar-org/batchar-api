import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ReportReason } from './entities/report-reason.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import {
  ReportMessageRequest,
  ReportProductRequest,
  ReportUserRequest,
} from './dto/report.dto';

@Injectable()
export class ReportService {
  private static readonly DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async reportUser(
    reporterId: number,
    request: ReportUserRequest,
  ): Promise<number> {
    const { targetUserId, reason, description } = request;

    if (Number(reporterId) === Number(targetUserId)) {
      throw new BusinessException('SELF_REPORT_NOT_ALLOWED');
    }

    const exists = await this.userRepository.exists({
      where: { id: targetUserId },
    });
    if (!exists) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    await this.ensureNoDuplicate(reporterId, {
      targetUser: { id: targetUserId },
    });

    return this.insertReport(reporterId, reason, description, {
      targetUser: { id: targetUserId } as User,
    });
  }

  async reportProduct(
    reporterId: number,
    request: ReportProductRequest,
  ): Promise<number> {
    const { targetProductId, reason, description } = request;

    const exists = await this.productRepository.exists({
      where: { id: targetProductId },
    });
    if (!exists) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }

    await this.ensureNoDuplicate(reporterId, {
      targetProduct: { id: targetProductId },
    });

    return this.insertReport(reporterId, reason, description, {
      targetProduct: { id: targetProductId } as Product,
    });
  }

  async reportMessage(
    reporterId: number,
    request: ReportMessageRequest,
  ): Promise<number> {
    const { targetMessageId, reason, description } = request;

    const exists = await this.chatMessageRepository.exists({
      where: { id: targetMessageId },
    });
    if (!exists) {
      throw new BusinessException('CHAT_MESSAGE_NOT_FOUND');
    }

    await this.ensureNoDuplicate(reporterId, {
      targetMessage: { id: targetMessageId },
    });

    return this.insertReport(reporterId, reason, description, {
      targetMessage: { id: targetMessageId } as ChatMessage,
    });
  }

  // 동일 신고자 + 동일 대상 24시간 내 중복 신고 차단 (Supabase reports_prevent_duplicate 트리거와 동일)
  private async ensureNoDuplicate(
    reporterId: number,
    target: {
      targetUser?: { id: number };
      targetProduct?: { id: number };
      targetMessage?: { id: number };
    },
  ): Promise<void> {
    const since = new Date(Date.now() - ReportService.DEDUP_WINDOW_MS);
    const duplicate = await this.reportRepository.findOne({
      where: {
        reporter: { id: reporterId },
        ...target,
        createdAt: MoreThan(since),
      },
    });
    if (duplicate) {
      throw new BusinessException('DUPLICATE_REPORT_WITHIN_24H');
    }
  }

  private async insertReport(
    reporterId: number,
    reason: ReportReason,
    description: string | undefined,
    target: Partial<
      Pick<Report, 'targetUser' | 'targetProduct' | 'targetMessage'>
    >,
  ): Promise<number> {
    const report = this.reportRepository.create({
      reporter: { id: reporterId } as User,
      reason,
      description: description ?? null,
      ...target,
    });
    await this.reportRepository.save(report);
    return Number(report.id);
  }
}
