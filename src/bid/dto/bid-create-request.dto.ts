import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class BidCreateRequest {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  price: number;
}
