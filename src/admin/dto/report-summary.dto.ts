import { ReportReason } from '../../report/enum/report-reason.enum';
import { ReportStatus } from '../../report/enum/report-status.enum';

export class ReportSummary {
  reportId: number;

  reporterId: number;

  reporterName: string;

  reason: ReportReason;

  status: ReportStatus;

  description: string | null;

  targetUserId: number | null;

  targetProductId: number | null;

  targetMessageId: number | null;

  targetChatId: number | null;

  targetUserSuspendedUntil: Date | null;

  targetMessageSenderId: number | null;

  targetMessageSenderName: string | null;

  targetMessageSenderSuspendedUntil: Date | null;

  createdAt: Date;

  reviewedAt: Date | null;
}
