export class ChatListResponse {
  chatId: number;

  productId: number;

  productTitle: string;

  productPrice: number;

  partnerId: number;

  partnerName: string;

  partnerFertility: number;

  partnerProfileImageUrl: string | null;

  productImageUrl: string | null;

  lastMessage: string;

  unreadCount: number;

  updatedAt: Date;

  myConfirmed: boolean;

  partnerConfirmed: boolean;

  isBlocked: boolean;

  iBlocked: boolean;

  blockedByPartner: boolean;

  isSeller: boolean;

  partnerLeft: boolean;
}
