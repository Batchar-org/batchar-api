import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { Report } from '../report/entities/report.entity';
import { ReportStatus } from '../report/entities/report-status.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { NotificationService } from '../notification/notification.service';
import { ProductService } from '../product/product.service';
import {
  ReportDetail,
  ReportListRequest,
  ReportChatMessageSummary,
  ReportSummary,
  ResolveReportRequest,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private static readonly SUSPENSION_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly notificationService: NotificationService,
    private readonly productService: ProductService,
  ) {}

  async suspendUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    user.suspendForDays(AdminService.SUSPENSION_DAYS);
    await this.userRepository.save(user);
  }

  async unsuspendUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    user.unsuspend();
    await this.userRepository.save(user);
  }

  async deleteProduct(productId: number): Promise<void> {
    await this.productService.deleteProductByAdmin(productId);
  }

  async resolveReport(
    reportId: number,
    request: ResolveReportRequest,
  ): Promise<void> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: { reporter: true },
    });
    if (!report) {
      throw new BusinessException('REPORT_NOT_FOUND');
    }
    report.status = request.status;
    report.reviewedAt = new Date();
    await this.reportRepository.save(report);

    // 종결(처리완료/반려) 상태일 때만 신고자에게 결과 알림 (fire-and-forget)
    if (
      report.status === ReportStatus.RESOLVED ||
      report.status === ReportStatus.DISMISSED
    ) {
      void this.notificationService.notifyReportResolved({
        reporterId: Number(report.reporter.id),
        status: report.status,
      });
    }
  }

  async listReports(request: ReportListRequest) {
    const { status, page, size } = request;
    const skip = page * size;
    const take = size + 1;

    const reports = await this.reportRepository.find({
      where: status ? { status } : {},
      relations: {
        reporter: true,
        targetUser: true,
        targetProduct: true,
        targetMessage: { sender: true },
        targetChatRoom: true,
      },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const hasNext = reports.length > size;
    const sliced = hasNext ? reports.slice(0, size) : reports;

    const content: ReportSummary[] = sliced.map((r) => this.toReportSummary(r));

    return { content, hasNext };
  }

  async getReportDetail(reportId: number): Promise<ReportDetail> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      relations: {
        reporter: true,
        targetUser: true,
        targetProduct: true,
        targetMessage: { sender: true, chat: true },
        targetChatRoom: true,
      },
    });

    if (!report) {
      throw new BusinessException('REPORT_NOT_FOUND');
    }

    const chatId = this.resolveReportChatId(report);
    const chatMessages = chatId
      ? await this.getReportChatMessages(
          chatId,
          report.targetMessage ? Number(report.targetMessage.id) : null,
        )
      : [];

    return {
      ...this.toReportSummary(report),
      chatId,
      chatMessages,
    };
  }

  private async getReportChatMessages(
    chatId: number,
    reportedMessageId: number | null,
  ): Promise<ReportChatMessageSummary[]> {
    const messages = await this.chatMessageRepository.find({
      where: { chat: { id: chatId } },
      relations: { sender: true },
      order: { createdAt: 'ASC' },
    });

    return messages.map((message) => ({
      messageId: Number(message.id),
      senderId: Number(message.sender.id),
      senderName: message.sender.name,
      content: message.message,
      createdAt: message.createdAt,
      isReportedMessage:
        reportedMessageId !== null && Number(message.id) === reportedMessageId,
    }));
  }

  private resolveReportChatId(report: Report): number | null {
    if (report.targetMessage?.chat) return Number(report.targetMessage.chat.id);
    if (report.targetChatRoom) return Number(report.targetChatRoom.id);
    return null;
  }

  private toReportSummary(report: Report): ReportSummary {
    return {
      reportId: Number(report.id),
      reporterId: Number(report.reporter.id),
      reporterName: report.reporter.name,
      reason: report.reason,
      status: report.status,
      description: report.description,
      targetUserId: report.targetUser ? Number(report.targetUser.id) : null,
      targetProductId: report.targetProduct
        ? Number(report.targetProduct.id)
        : null,
      targetMessageId: report.targetMessage
        ? Number(report.targetMessage.id)
        : null,
      targetChatId: report.targetChatRoom
        ? Number(report.targetChatRoom.id)
        : null,
      targetUserSuspendedUntil: report.targetUser?.suspendedUntil ?? null,
      targetMessageSenderId: report.targetMessage?.sender
        ? Number(report.targetMessage.sender.id)
        : null,
      targetMessageSenderName: report.targetMessage?.sender?.name ?? null,
      targetMessageSenderSuspendedUntil:
        report.targetMessage?.sender?.suspendedUntil ?? null,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
    };
  }
}
