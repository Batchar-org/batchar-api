import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductStatus } from '../entities/product-status.enum';
import { ProductViewType } from '../entities/product-view-type.enum';
import { ProductMediaType } from '../entities/product-media-type.enum';

export class ProductResponse {
  id: number;

  constructor(id: number) {
    this.id = id;
  }
}

export class ProductSummary {
  id: number;

  sellerName: string;

  sellerProfileImageUrl: string | null;

  title: string;

  startPrice: number;

  currentPrice: number;

  status: ProductStatus;

  endTime: Date;

  mainImageUrl: string | null;

  wishCount: number;

  bidCount: number;
}

export class ProductMediaInfo {
  id: number;

  mediaUrl: string;

  mediaType: ProductMediaType;
}

export class ProductDetailResponse {
  id: number;

  sellerId: number;

  sellerName: string;

  sellerProfileImageUrl: string | null;

  sellerFertility: number;

  winnerName: string | null;

  winnerProfileImageUrl: string | null;

  title: string;

  description: string;

  category: string;

  startPrice: number;

  currentPrice: number;

  status: ProductStatus;

  startTime: Date;

  endTime: Date;

  isTopBidder: boolean;

  mediaUrls: ProductMediaInfo[];

  wishCount: number;

  bidCount: number;

  isWished: boolean;
}

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

export class ProductUpdateRequest {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @Type(() => Date)
  @IsOptional()
  endTime?: Date;

  @Transform(({ value }) => {
    // form-data로 전송될 때 배열이나 문자열 형태로 수신되는 경우를 파싱합니다.
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    return value;
  })
  @IsInt({ each: true })
  @IsOptional()
  deleteMediaIds?: number[];
}
