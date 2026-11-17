export class ChatMessageResponse {
  messageId: number;

  senderId: number;

  senderProfileImageUrl: string | null;

  content: string;

  isRead: boolean;

  createdAt: Date;
}
