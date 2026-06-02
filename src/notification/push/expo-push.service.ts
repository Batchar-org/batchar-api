import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

/**
 * Expo Push Service로의 전송만 담당하는 순수 트랜스포트.
 * 전송 실패가 도메인 트랜잭션에 영향을 주지 않도록 throw하지 않고 로깅한다.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private readonly expo: Expo;

  constructor() {
    this.expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  }

  isValidToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  /**
   * 메시지들을 청크 단위로 전송하고, ticket 단계에서 더 이상 유효하지 않은
   * (DeviceNotRegistered) Expo 토큰 목록을 반환한다. 호출 측은 이 토큰들을 정리한다.
   */
  async send(messages: ExpoPushMessage[]): Promise<string[]> {
    if (messages.length === 0) {
      return [];
    }

    const invalidTokens: string[] = [];
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        this.collectInvalidTokens(chunk, tickets, invalidTokens);
      } catch (e) {
        this.logger.error(
          `Failed to send push chunk (size=${chunk.length})`,
          e,
        );
      }
    }

    return invalidTokens;
  }

  // ticket과 chunk는 동일 순서이므로 index로 매핑하여 무효 토큰을 추출한다.
  private collectInvalidTokens(
    chunk: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
    acc: string[],
  ): void {
    tickets.forEach((ticket, index) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        const to = chunk[index]?.to;
        if (typeof to === 'string') {
          acc.push(to);
        }
      }
    });
  }
}
