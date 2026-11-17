import { ProductStatus } from '../enum/product-status.enum';

export class ProductSummary {
  id: number;

  sellerName: string;

  sellerProfileImageUrl: string | null;

  title: string;

  startPrice: number;

  currentPrice: number;

  myBidPrice: number | null;

  status: ProductStatus;

  endTime: Date;

  mainImageUrl: string | null;

  wishCount: number;

  bidCount: number;

  isWinner: boolean;
}
