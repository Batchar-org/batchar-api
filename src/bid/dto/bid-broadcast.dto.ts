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
