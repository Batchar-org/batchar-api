import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

import { ReportReason } from '../enum/report-reason.enum';

export class ReportMessageRequest {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  targetMessageId: number;

  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
