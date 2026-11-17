import type { Bid } from '../entities/bid.entity';

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
