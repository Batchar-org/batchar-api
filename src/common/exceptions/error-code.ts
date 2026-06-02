import { HttpStatus } from '@nestjs/common';

export interface ErrorCodeDetail {
  httpStatus: HttpStatus;
  message: string;
}

export const ErrorCode = {
  // Common
  INVALID_INPUT_VALUE: { httpStatus: HttpStatus.BAD_REQUEST, message: '입력값이 올바르지 않습니다.' },
  INVALID_JSON_FORMAT: { httpStatus: HttpStatus.BAD_REQUEST, message: 'JSON 형식이 올바르지 않습니다.' },
  INVALID_PATH_VARIABLE: { httpStatus: HttpStatus.BAD_REQUEST, message: '경로 변수 타입이 올바르지 않습니다.' },
  METHOD_NOT_ALLOWED: { httpStatus: HttpStatus.METHOD_NOT_ALLOWED, message: '지원하지 않는 HTTP 메서드입니다.' },
  INTERNAL_SERVER_ERROR: { httpStatus: HttpStatus.INTERNAL_SERVER_ERROR, message: '서버 내부 오류가 발생했습니다.' },
  UNAUTHORIZED: { httpStatus: HttpStatus.UNAUTHORIZED, message: '인증이 필요합니다.' },

  // User
  USER_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '사용자를 찾을 수 없습니다.' },
  DUPLICATE_EMAIL: { httpStatus: HttpStatus.CONFLICT, message: '이미 존재하는 이메일입니다.' },
  DUPLICATE_NAME: { httpStatus: HttpStatus.CONFLICT, message: '이미 사용 중인 닉네임입니다.' },
  INVALID_CREDENTIALS: { httpStatus: HttpStatus.UNAUTHORIZED, message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
  INVALID_TOKEN: { httpStatus: HttpStatus.UNAUTHORIZED, message: '유효하지 않은 토큰입니다.' },
  HAS_ACTIVE_AUCTION: { httpStatus: HttpStatus.CONFLICT, message: '진행 중인 경매가 있어 탈퇴할 수 없습니다.' },
  HAS_ACTIVE_BID: { httpStatus: HttpStatus.CONFLICT, message: '진행 중인 경매에 입찰 중이어서 탈퇴할 수 없습니다.' },
  INVALID_PASSWORD: { httpStatus: HttpStatus.UNAUTHORIZED, message: '비밀번호가 올바르지 않습니다.' },

  // Email
  EMAIL_SEND_FAILED: { httpStatus: HttpStatus.INTERNAL_SERVER_ERROR, message: '이메일 발송에 실패했습니다.' },
  INVALID_EMAIL_DOMAIN: { httpStatus: HttpStatus.BAD_REQUEST, message: '한밭대학교 이메일만 가입 가능합니다.' },
  INVALID_VERIFICATION_CODE: { httpStatus: HttpStatus.BAD_REQUEST, message: '인증 코드가 올바르지 않습니다.' },
  EMAIL_NOT_VERIFIED: { httpStatus: HttpStatus.BAD_REQUEST, message: '이메일 인증이 완료되지 않았습니다.' },

  // Product
  PRODUCT_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '상품을 찾을 수 없습니다.' },
  PRODUCT_UPDATE_FORBIDDEN: { httpStatus: HttpStatus.FORBIDDEN, message: '본인 상품만 수정할 수 있습니다.' },
  PRODUCT_DELETE_FORBIDDEN: { httpStatus: HttpStatus.FORBIDDEN, message: '본인 상품만 삭제할 수 있습니다.' },
  PRODUCT_MEDIA_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '상품 미디어를 찾을 수 없습니다.' },
  PRODUCT_MEDIA_REQUIRED: { httpStatus: HttpStatus.BAD_REQUEST, message: '상품 미디어는 최소 1개 이상이어야 합니다.' },
  AUCTION_ALREADY_CLOSED: { httpStatus: HttpStatus.BAD_REQUEST, message: '이미 마감된 경매입니다.' },
  PRODUCT_CLOSE_FORBIDDEN: { httpStatus: HttpStatus.FORBIDDEN, message: '본인 상품만 경매 마감을 할 수 있습니다.' },

  // Bid
  INVALID_BID_PRICE: { httpStatus: HttpStatus.BAD_REQUEST, message: '입찰 금액은 현재 최고가보다 높아야 합니다.' },
  AUCTION_CLOSED: { httpStatus: HttpStatus.BAD_REQUEST, message: '종료된 경매에는 입찰할 수 없습니다.' },
  SELF_BID_NOT_ALLOWED: { httpStatus: HttpStatus.FORBIDDEN, message: '본인 상품에는 입찰할 수 없습니다.' },

  // Storage
  FILE_UPLOAD_FAILED: { httpStatus: HttpStatus.INTERNAL_SERVER_ERROR, message: '파일 업로드에 실패했습니다.' },
  PROFILE_IMAGE_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '프로필 이미지를 찾을 수 없습니다.' },
  UNSUPPORTED_MEDIA_TYPE: { httpStatus: HttpStatus.BAD_REQUEST, message: '지원하지 않는 파일 형식입니다.' },

  // Wish
  WISH_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '찜을 찾을 수 없습니다.' },
  WISH_ALREADY_EXISTS: { httpStatus: HttpStatus.CONFLICT, message: '이미 찜한 상품입니다.' },

  // Chat
  CHAT_ACCESS_DENIED: { httpStatus: HttpStatus.UNAUTHORIZED, message: '채팅방 접근 권한이 없습니다.' },
  CHATROOM_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '채팅방을 찾을 수 없습니다.' },
  CHAT_MESSAGE_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '채팅 메시지를 찾을 수 없습니다.' },
  TRADE_NOT_AVAILABLE: { httpStatus: HttpStatus.BAD_REQUEST, message: '거래 완료를 요청할 수 없는 상태입니다.' },
  ALREADY_CONFIRMED: { httpStatus: HttpStatus.CONFLICT, message: '이미 거래 완료를 확정하였습니다.' },

  // Block
  SELF_BLOCK_NOT_ALLOWED: { httpStatus: HttpStatus.BAD_REQUEST, message: '본인을 차단할 수 없습니다.' },
  ALREADY_BLOCKED: { httpStatus: HttpStatus.CONFLICT, message: '이미 차단한 사용자입니다.' },
  BLOCKED: { httpStatus: HttpStatus.FORBIDDEN, message: '차단 관계인 사용자와는 거래할 수 없습니다.' },

  // Report
  SELF_REPORT_NOT_ALLOWED: { httpStatus: HttpStatus.BAD_REQUEST, message: '본인을 신고할 수 없습니다.' },
  DUPLICATE_REPORT_WITHIN_24H: { httpStatus: HttpStatus.CONFLICT, message: '이미 신고하셨습니다. 24시간 후에 다시 시도해주세요.' },
  INVALID_REPORT_TARGET: { httpStatus: HttpStatus.BAD_REQUEST, message: '신고 대상이 올바르지 않습니다.' },
  DESCRIPTION_TOO_LONG: { httpStatus: HttpStatus.BAD_REQUEST, message: '신고 설명은 최대 500자까지 입력할 수 있습니다.' },
  REPORT_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '신고를 찾을 수 없습니다.' },

  // Moderation
  USER_SUSPENDED: { httpStatus: HttpStatus.FORBIDDEN, message: '정지되었거나 탈퇴한 사용자입니다.' },
  ADMIN_FORBIDDEN: { httpStatus: HttpStatus.FORBIDDEN, message: '관리자만 접근할 수 있습니다.' },

  // Notification
  INVALID_PUSH_TOKEN: { httpStatus: HttpStatus.BAD_REQUEST, message: '유효하지 않은 푸시 토큰입니다.' },
  NOTIFICATION_NOT_FOUND: { httpStatus: HttpStatus.NOT_FOUND, message: '알림을 찾을 수 없습니다.' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
