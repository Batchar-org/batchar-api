import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BidCreateRequest {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  price: number;
}
