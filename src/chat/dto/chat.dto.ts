import { IsNotEmpty, IsString } from 'class-validator';

export class ChatListResponse {
  chatId: number;

  productId: number;

  partnerName: string;

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

export class ChatMessageRequest {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class ChatMessageResponse {
  messageId: number;

  senderId: number;

  senderProfileImageUrl: string | null;

  content: string;

  isRead: boolean;

  hidden: boolean;

  createdAt: Date;
}
