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
import { ReportReason } from '../enum/report-reason.enum';

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
