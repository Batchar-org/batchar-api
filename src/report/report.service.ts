import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { ReportReason } from './entities/report-reason.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { NotificationService } from '../notification/notification.service';
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
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    private readonly notificationService: NotificationService,
  ) {}

  async reportUser(
    reporterId: number,
    request: ReportUserRequest,
  ): Promise<number> {
    const { targetUserId, reason, description, chatId } = request;

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

    const target: Partial<
      Pick<
        Report,
        'targetUser' | 'targetProduct' | 'targetMessage' | 'targetChatRoom'
      >
    > = {
      targetUser: { id: targetUserId } as User,
    };

    if (chatId) {
      await this.validateChatReportContext(chatId, reporterId, targetUserId);
      target.targetChatRoom = { id: chatId } as ChatRoom;
    }

    return this.insertReport(reporterId, reason, description, target);
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

    const targetMessage = await this.chatMessageRepository.findOne({
      where: { id: targetMessageId },
      relations: { sender: true, chat: { seller: true, buyer: true } },
    });
    if (!targetMessage) {
      throw new BusinessException('CHAT_MESSAGE_NOT_FOUND');
    }
    if (Number(targetMessage.sender.id) === Number(reporterId)) {
      throw new BusinessException('SELF_REPORT_NOT_ALLOWED');
    }
    if (!targetMessage.chat.isParticipant(reporterId)) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
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
      Pick<
        Report,
        'targetUser' | 'targetProduct' | 'targetMessage' | 'targetChatRoom'
      >
    >,
  ): Promise<number> {
    const report = this.reportRepository.create({
      reporter: { id: reporterId } as User,
      reason,
      description: description ?? null,
      ...target,
    });
    await this.reportRepository.save(report);
    void this.notificationService.notifyReportCreated({
      reportId: Number(report.id),
    });
    return Number(report.id);
  }

  private async validateChatReportContext(
    chatId: number,
    reporterId: number,
    targetUserId: number,
  ): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatId },
      relations: { seller: true, buyer: true },
    });
    if (!chatRoom) {
      throw new BusinessException('CHATROOM_NOT_FOUND');
    }
    if (
      !chatRoom.isParticipant(reporterId) ||
      !chatRoom.isParticipant(targetUserId)
    ) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
    }
  }
}
