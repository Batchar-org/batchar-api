import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportReason } from '../../report/entities/report-reason.enum';
import { ReportStatus } from '../../report/entities/report-status.enum';

export class ReportListRequest {
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  page: number = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  size: number = 10;
}

export class ResolveReportRequest {
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status: ReportStatus;
}

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

  createdAt: Date;

  reviewedAt: Date | null;
}
