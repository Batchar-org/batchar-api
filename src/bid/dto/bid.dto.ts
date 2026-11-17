import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BidStatus } from '../enum/bid-status.enum';
import type { Bid } from '../entities/bid.entity';

export class BidCreateRequest {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  price: number;
}

export class BidResponse {
  id: number;

  price: number;

  status: BidStatus;

  createdAt: Date;

  static from(bid: Bid): BidResponse {
    return {
      id: bid.id,
      price: Number(bid.price),
      status: bid.status,
      createdAt: bid.createdAt,
    };
  }
}

export class BidSummary {
  price: number;

  bidderName: string;

  createdAt: Date;

  static from(bid: Bid): BidSummary {
    return {
      price: Number(bid.price),
      bidderName: bid.bidder.name,
      createdAt: bid.createdAt,
    };
  }
}

export class BidBroadcast {
  productId: number;

  currentPrice: number;

  bidderName: string;

  createdAt: Date;

  constructor(
    productId: number,
    currentPrice: number,
    bidderName: string,
    createdAt: Date,
  ) {
    this.productId = productId;
    this.currentPrice = currentPrice;
    this.bidderName = bidderName;
    this.createdAt = createdAt;
  }
}

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
