/**
 * 알림 종류. 알림함 아이콘/표시 및 서버 내부 분기에 사용한다.
 * 클라이언트 라우팅은 이 값이 아니라 알림 payload의 `data.category`(5종)로 수행한다.
 */
export enum NotificationType {
  CHAT = 'CHAT', // 채팅 메시지 수신 (수신자)
  BID = 'BID', // 내 상품에 새 입찰 (판매자)
  OUTBID = 'OUTBID', // 상위 입찰에 밀림 (직전 최고입찰자)
  AUCTION_WON = 'AUCTION_WON', // 낙찰 (낙찰자)
  AUCTION_SOLD = 'AUCTION_SOLD', // 낙찰 성사 (판매자)
  AUCTION_LOST = 'AUCTION_LOST', // 패찰 (낙찰되지 못한 입찰자)
  AUCTION_FAILED = 'AUCTION_FAILED', // 유찰 (판매자)
  REPORT_RESOLVED = 'REPORT_RESOLVED', // 신고 처리 완료 (신고자)
}

/**
 * 클라이언트 딥링크 분기에 사용하는 카테고리(5종).
 * NotificationType 8종을 이 5종으로 매핑하여 알림 payload의 data에 실어 보낸다.
 */
export type NotificationCategory =
  | 'chat'
  | 'bid'
  | 'outbid'
  | 'auction'
  | 'report';

/**
 * 알림에 동봉되는 딥링크용 데이터.
 * 인앱 알림함 응답(SnakeCaseInterceptor가 snake_case로 변환)과 푸시 payload(전송 시 snake_case로 변환)에서
 * 동일한 형태(category / chat_id / product_id)로 클라이언트에 전달된다.
 */
export interface NotificationData {
  category: NotificationCategory;
  chatId?: number;
  productId?: number;
}
