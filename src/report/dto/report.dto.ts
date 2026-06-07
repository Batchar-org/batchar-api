import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportReason } from '../entities/report-reason.enum';

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

export class ReportProductRequest {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  @Min(1)
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
