import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportReason } from '../entities/report-reason.enum';

export class ReportUserRequest {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  targetUserId: number;

  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class ReportProductRequest {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  targetProductId: number;

  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class ReportMessageRequest {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  targetMessageId: number;

  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
