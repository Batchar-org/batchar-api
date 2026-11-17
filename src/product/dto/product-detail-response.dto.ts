import { ProductStatus } from '../enum/product-status.enum';
import { ProductMediaInfo } from './product-media-info.dto';

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
