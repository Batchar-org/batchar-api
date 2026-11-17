import { ReportChatMessageSummary } from './report-chat-message-summary.dto';
import { ReportSummary } from './report-summary.dto';

export class ReportDetail extends ReportSummary {
  chatId: number | null;

  chatMessages: ReportChatMessageSummary[];
}
