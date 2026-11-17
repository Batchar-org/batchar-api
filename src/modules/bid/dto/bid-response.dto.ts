import type { Bid } from '../entities/bid.entity';
import { BidStatus } from '../enum/bid-status.enum';

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
