import { ReportSummary } from './report-summary.dto';
import { ReportChatMessageSummary } from './report-chat-message-summary.dto';

export class ReportDetail extends ReportSummary {
  chatId: number | null;

  chatMessages: ReportChatMessageSummary[];
}
