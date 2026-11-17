import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BidListRequest {
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
