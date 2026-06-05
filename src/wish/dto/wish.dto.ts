import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../../product/entities/product-status.enum';

export class WishSummary {
  id: number;

  productId: number;

  title: string;

  startPrice: number;

  currentPrice: number;

  status: ProductStatus;

  endTime: Date;

  mainImageUrl: string | null;

  bidCount: number;
}

export class WishListRequest {
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
