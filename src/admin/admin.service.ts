import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { Report } from '../report/entities/report.entity';
import { ProductStatus } from '../product/entities/product-status.enum';
import { ReportStatus } from '../report/entities/report-status.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { NotificationService } from '../notification/notification.service';
import {
  ReportListRequest,
  ReportSummary,
  ResolveReportRequest,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly notificationService: NotificationService,
  ) {}

  async suspendUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    user.suspendedAt = new Date();
    await this.userRepository.save(user);
  }

  async unsuspendUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }
    user.suspendedAt = null;
    await this.userRepository.save(user);
  }

  async hideProduct(productId: number): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new BusinessException('PRODUCT_NOT_FOUND');
    }
    product.status = ProductStatus.HIDDEN;
    await this.productRepository.save(product);
  }

  async hideChatMessage(messageId: number): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });
    if (!message) {
      throw new BusinessException('CHAT_MESSAGE_NOT_FOUND');
    }
    message.hidden = true;
    await this.chatMessageRepository.save(message);
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
    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
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
        targetMessage: true,
      },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    const hasNext = reports.length > size;
    const sliced = hasNext ? reports.slice(0, size) : reports;

    const content: ReportSummary[] = sliced.map((r) => ({
      reportId: Number(r.id),
      reporterId: Number(r.reporter.id),
      reporterName: r.reporter.name,
      reason: r.reason,
      status: r.status,
      description: r.description,
      targetUserId: r.targetUser ? Number(r.targetUser.id) : null,
      targetProductId: r.targetProduct ? Number(r.targetProduct.id) : null,
      targetMessageId: r.targetMessage ? Number(r.targetMessage.id) : null,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
    }));

    return { content, hasNext };
  }
}
