import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportStatus } from '../../report/enum/report-status.enum';

export class ResolveReportRequest {
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status: ReportStatus;
}
