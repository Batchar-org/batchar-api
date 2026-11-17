import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductCreateRequest {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  startPrice: number;

  @Type(() => Date)
  @IsNotEmpty()
  endTime: Date;
}
