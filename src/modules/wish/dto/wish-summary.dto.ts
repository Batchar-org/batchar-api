import { ProductStatus } from '../../product/enum/product-status.enum';

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
