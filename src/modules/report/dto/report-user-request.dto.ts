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

export class ReportUserRequest {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  targetUserId: number;

  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  chatId?: number;
}
