import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductViewType } from '../enum/product-view-type.enum';

export class ProductListRequest {
  @IsEnum(ProductViewType)
  @IsOptional()
  view: ProductViewType = ProductViewType.ALL;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  keyword?: string;

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
