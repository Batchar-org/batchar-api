import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import snakecaseKeys from 'snakecase-keys';
import { ExpoPushMessage } from 'expo-server-sdk';
import { DeviceToken } from './entities/device-token.entity';
import { Notification } from './entities/notification.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import {
  NotificationType,
  NotificationData,
} from './entities/notification-type.enum';
import { User } from '../user/entities/user.entity';
import { ReportStatus } from '../report/entities/report-status.enum';
import { ExpoPushService } from './push/expo-push.service';
import { BusinessException } from '../common/exceptions/business.exception';
import {
  NotificationListRequest,
  NotificationResponse,
} from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationSetting)
    private readonly settingRepository: Repository<NotificationSetting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly expoPushService: ExpoPushService,
  ) {}

  // ==================== 디바이스 토큰 ====================

  async registerDeviceToken(userId: number, token: string): Promise<void> {
    if (!this.expoPushService.isValidToken(token)) {
      throw new BusinessException('INVALID_PUSH_TOKEN');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    // 같은 기기 토큰이 다른 계정에 묶여 있을 수 있으므로 먼저 제거하여 1토큰=1사용자를 보장
    await this.deviceTokenRepository.delete({ token });
    await this.deviceTokenRepository.save(DeviceToken.create(user, token));
  }

  async removeDeviceToken(userId: number, token: string): Promise<void> {
    if (!token) {
      return; // 토큰 미지정 시 해당 사용자의 전체 토큰이 삭제되는 것을 방지
    }
    await this.deviceTokenRepository.delete({ user: { id: userId }, token });
  }

  // ==================== 알림함 ====================

  async getNotifications(userId: number, request: NotificationListRequest) {
    const { page, size } = request;

    const notifications = await this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip: page * size,
      take: size + 1,
    });

    const hasNext = notifications.length > size;
    const sliced = hasNext ? notifications.slice(0, size) : notifications;

    return {
      content: sliced.map((notification) =>
        NotificationResponse.from(notification),
      ),
      hasNext,
    };
  }

  async getUnreadCount(userId: number) {
    const count = await this.notificationRepository.count({
      where: { user: { id: userId }, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: number, notificationId: number): Promise<void> {
    const result = await this.notificationRepository.update(
      { id: notificationId, user: { id: userId } },
      { isRead: true },
    );

    if (!result.affected) {
      throw new BusinessException('NOTIFICATION_NOT_FOUND');
    }
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }

  async deleteNotification(userId: number, notificationId: number): Promise<void> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      user: { id: userId },
    });
    if (!result.affected) {
      throw new BusinessException('NOTIFICATION_NOT_FOUND');
    }
  }

  async deleteAllNotifications(userId: number): Promise<void> {
    await this.notificationRepository.delete({ user: { id: userId } });
  }

  // ==================== 설정 ====================

  async getSetting(userId: number) {
    const setting = await this.settingRepository.findOne({
      where: { user: { id: userId } },
    });
    return { pushEnabled: setting ? setting.pushEnabled : true };
  }

  async updateSetting(userId: number, pushEnabled: boolean) {
    let setting = await this.settingRepository.findOne({
      where: { user: { id: userId } },
    });

    if (setting) {
      setting.pushEnabled = pushEnabled;
    } else {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new BusinessException('USER_NOT_FOUND');
      }
      setting = NotificationSetting.create(user, pushEnabled);
    }

    await this.settingRepository.save(setting);
    return { pushEnabled };
  }

  // ==================== 도메인 발송(notify*) ====================
  // 모든 notify* 메서드는 도메인 트랜잭션 커밋 이후 fire-and-forget으로 호출되며 절대 throw하지 않는다.

  async notifyChatMessage(params: {
    recipientId: number;
    chatId: number;
    productId: number;
    senderName: string;
    preview: string;
  }): Promise<void> {
    await this.dispatch(
      params.recipientId,
      NotificationType.CHAT,
      params.senderName,
      this.truncate(params.preview, 50),
      { category: 'chat', chatId: params.chatId, productId: params.productId },
    );
  }

  async notifyBidPlaced(params: {
    sellerId: number;
    productId: number;
    productTitle: string;
    bidderName: string;
    price: number;
  }): Promise<void> {
    await this.dispatch(
      params.sellerId,
      NotificationType.BID,
      '새 입찰이 등록되었어요',
      `'${params.productTitle}'에 ${params.bidderName}님이 ${this.formatPrice(params.price)}을 입찰했어요.`,
      { category: 'bid', productId: params.productId },
    );
  }

  async notifyOutbid(params: {
    previousBidderId: number;
    productId: number;
    productTitle: string;
    newPrice: number;
  }): Promise<void> {
    await this.dispatch(
      params.previousBidderId,
      NotificationType.OUTBID,
      '다른 사용자가 더 높은 금액을 제시했어요',
      `'${params.productTitle}'의 최고 입찰가가 ${this.formatPrice(params.newPrice)}으로 갱신됐어요.`,
      { category: 'outbid', productId: params.productId },
    );
  }

  async notifyAuctionWon(params: {
    winnerId: number;
    productId: number;
    productTitle: string;
    price: number;
    sellerName: string;
  }): Promise<void> {
    await this.dispatch(
      params.winnerId,
      NotificationType.AUCTION_WON,
      '축하해요! 낙찰되었어요 🎉',
      `'${params.productTitle}'을(를) ${this.formatPrice(params.price)}에 낙찰받았어요. 판매자 ${params.sellerName}님과 거래를 진행해보세요.`,
      { category: 'auction', productId: params.productId },
    );
  }

  async notifyAuctionSold(params: {
    sellerId: number;
    productId: number;
    productTitle: string;
    price: number;
    winnerName: string;
  }): Promise<void> {
    await this.dispatch(
      params.sellerId,
      NotificationType.AUCTION_SOLD,
      '상품이 낙찰되었어요',
      `'${params.productTitle}'이(가) ${params.winnerName}님에게 ${this.formatPrice(params.price)}에 낙찰됐어요.`,
      { category: 'auction', productId: params.productId },
    );
  }

  async notifyAuctionLost(params: {
    loserId: number;
    productId: number;
    productTitle: string;
  }): Promise<void> {
    await this.dispatch(
      params.loserId,
      NotificationType.AUCTION_LOST,
      '경매가 종료되었어요',
      `아쉽지만 '${params.productTitle}' 경매에서 낙찰되지 못했어요.`,
      { category: 'auction', productId: params.productId },
    );
  }

  async notifyAuctionFailed(params: {
    sellerId: number;
    productId: number;
    productTitle: string;
  }): Promise<void> {
    await this.dispatch(
      params.sellerId,
      NotificationType.AUCTION_FAILED,
      '경매가 유찰되었어요',
      `'${params.productTitle}'은(는) 입찰자가 없어 유찰됐어요.`,
      { category: 'auction', productId: params.productId },
    );
  }

  async notifyReportResolved(params: {
    reporterId: number;
    status: ReportStatus;
  }): Promise<void> {
    await this.dispatch(
      params.reporterId,
      NotificationType.REPORT_RESOLVED,
      '신고가 처리되었어요',
      this.reportResolvedBody(params.status),
      { category: 'report' },
    );
  }

  // ==================== 내부 발송 파이프라인 ====================

  /**
   * 알림 1건을 한 사용자에게 발송한다.
   * 1) 수신자 검증(존재/활성) → 2) 인앱 이력 적재(항상) → 3) 푸시 설정 확인 → 4) 배지 계산 → 5) 전송 → 6) 무효 토큰 정리.
   * 백그라운드(fire-and-forget)에서 호출되므로 어떤 예외도 밖으로 전파하지 않는다.
   */
  private async dispatch(
    userId: number,
    type: NotificationType,
    title: string,
    body: string,
    data: NotificationData,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || !user.isActive()) {
        return; // 존재하지 않거나 정지/탈퇴한 사용자에게는 알림하지 않음
      }

      // 인앱 이력은 푸시 설정과 무관하게 항상 적재
      await this.notificationRepository.save(
        Notification.create(user, type, title, body, data),
      );

      // 푸시 마스터 스위치 (설정 행이 없으면 기본 ON)
      const setting = await this.settingRepository.findOne({
        where: { user: { id: userId } },
      });
      if (setting && !setting.pushEnabled) {
        return;
      }

      const deviceTokens = await this.deviceTokenRepository.find({
        where: { user: { id: userId } },
      });
      if (deviceTokens.length === 0) {
        return;
      }

      // 앱 아이콘 배지 = 사용자의 안 읽은 알림 수(방금 적재분 포함)
      const badge = await this.notificationRepository.count({
        where: { user: { id: userId }, isRead: false },
      });

      // data 키는 인앱 알림함 응답과 동일하게 보이도록 snake_case로 변환하여 실어 보낸다
      const pushData = snakecaseKeys(
        data as unknown as Record<string, unknown>,
        { deep: true },
      );
      const messages: ExpoPushMessage[] = deviceTokens.map((deviceToken) => ({
        to: deviceToken.token,
        sound: 'default',
        title,
        body,
        data: pushData,
        badge,
      }));

      const invalidTokens = await this.expoPushService.send(messages);
      if (invalidTokens.length > 0) {
        await this.deviceTokenRepository.delete({ token: In(invalidTokens) });
      }
    } catch (e) {
      this.logger.error(
        `Failed to dispatch notification type=${type} userId=${userId}`,
        e,
      );
    }
  }

  private formatPrice(price: number): string {
    return `${Number(price).toLocaleString('ko-KR')}원`;
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  private reportResolvedBody(status: ReportStatus): string {
    switch (status) {
      case ReportStatus.RESOLVED:
        return '접수하신 신고가 처리되었어요. 관심 가져주셔서 감사해요.';
      case ReportStatus.DISMISSED:
        return '접수하신 신고가 검토 후 반려되었어요.';
      default:
        return '접수하신 신고가 검토되었어요.';
    }
  }
}
