import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { ReportStatus } from '../../report/enum/report-status.enum';

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
