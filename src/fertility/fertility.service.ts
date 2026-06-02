import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { User } from '../user/entities/user.entity';
import { FertilityLog } from './entities/fertility-log.entity';
import { FertilityAction } from './fertility-action.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { BlockService } from '../block/block.service';

@Injectable()
export class FertilityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly blockService: BlockService,
  ) {}

  // 채팅 상대의 비옥도에 액션(물 주기 +0.5 / 산성비 -0.5)을 거래당 1회 적용한다.
  async react(giverId: number, chatId: number, action: FertilityAction): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const chatRoom = await manager.findOne(ChatRoom, {
        where: { id: chatId },
        relations: { seller: true, buyer: true },
      });
      if (!chatRoom) {
        throw new BusinessException('CHATROOM_NOT_FOUND');
      }
      if (!chatRoom.isParticipant(giverId)) {
        throw new BusinessException('CHAT_ACCESS_DENIED');
      }
      // 거래가 완료(양쪽 확정)된 뒤에만 평가할 수 있다.
      if (!chatRoom.isBothConfirmed()) {
        throw new BusinessException('FERTILITY_TRADE_NOT_COMPLETED');
      }

      // 발신자는 버튼을 누른 사람, 수신자는 상대 참여자(비옥도 적용 대상).
      const isGiverSeller = Number(chatRoom.seller.id) === Number(giverId);
      const giver = isGiverSeller ? chatRoom.seller : chatRoom.buyer;
      const receiverId = isGiverSeller ? Number(chatRoom.buyer.id) : Number(chatRoom.seller.id);

      // 차단 관계(양방향)면 평가할 수 없다.
      if (await this.blockService.isBlocked(giverId, receiverId)) {
        throw new BusinessException('BLOCKED');
      }

      // 동시성 안전을 위해 수신자 행을 잠그고 읽는다.
      const receiver = await manager.findOne(User, {
        where: { id: receiverId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!receiver) {
        throw new BusinessException('USER_NOT_FOUND');
      }

      // 한 거래(채팅)당 평가는 1회만 허용한다(물 주기/산성비 중 하나).
      const already = await manager.findOne(FertilityLog, {
        where: { giver: { id: giverId }, chatRoom: { id: chatId } },
      });
      if (already) {
        throw new BusinessException('FERTILITY_ALREADY_GIVEN');
      }

      // 경계(0% / 100%) 검증 후 적용
      if (action === FertilityAction.WATER) {
        if (!receiver.canReceiveWater()) {
          throw new BusinessException('FERTILITY_MAX_REACHED');
        }
        receiver.water();
      } else {
        if (!receiver.canReceiveAcidRain()) {
          throw new BusinessException('FERTILITY_MIN_REACHED');
        }
        receiver.acidRain();
      }
      await manager.save(receiver);

      const log = manager.create(FertilityLog, { giver, receiver, chatRoom, action });
      await manager.save(log);

      return receiver.fertility;
    });
  }
}
