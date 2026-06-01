import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { ProductMediaService } from '../product/product-media.service';
import { StorageService } from '../common/storage/storage.service';
import { BlockService } from '../block/block.service';
import { BidGateway } from '../websocket/bid.gateway';
import { BusinessException } from '../common/exceptions/business.exception';
import { ChatListResponse, ChatMessageResponse } from './dto/chat.dto';
import { ProductStatus } from '../product/entities/product-status.enum';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly productMediaService: ProductMediaService,
    private readonly storageService: StorageService,
    private readonly blockService: BlockService,
    @Inject(forwardRef(() => BidGateway))
    private readonly bidGateway: BidGateway,
  ) {}

  async generateChatRoom(product: Product, seller: User, bidder: User): Promise<void> {
    const chatRoom = ChatRoom.createChatRoom(product, seller, bidder);
    await this.chatRoomRepository.save(chatRoom);
  }

  async getChatLists(userId: number): Promise<ChatListResponse[]> {
    const chatRooms = await this.chatRoomRepository.find({
      where: [
        { seller: { id: userId }, sellerDeleted: false },
        { buyer: { id: userId }, buyerDeleted: false },
      ],
      relations: { seller: true, buyer: true, product: true },
    });

    const responses: ChatListResponse[] = [];
    for (const chatRoom of chatRooms) {
      const isSeller = Number(chatRoom.seller.id) === Number(userId);
      const partner = isSeller ? chatRoom.buyer : chatRoom.seller;
      const partnerName = partner.name;
      const partnerProfileImageUrl = partner.profileImageUrl;
      const myConfirmed = isSeller ? chatRoom.sellerConfirmed : chatRoom.buyerConfirmed;
      const partnerConfirmed = isSeller ? chatRoom.buyerConfirmed : chatRoom.sellerConfirmed;

      const lastMsgEntity = await this.chatMessageRepository.findOne({
        where: { chat: { id: chatRoom.id } },
        order: { createdAt: 'DESC' },
      });
      const lastMessage = lastMsgEntity ? lastMsgEntity.message : '';

      const productImageUrl = await this.productMediaService.getFirstMediaUrl(chatRoom.product.id);

      const unreadCount = await this.chatMessageRepository.count({
        where: {
          chat: { id: chatRoom.id },
          sender: { id: Not(userId) },
          isRead: false,
        },
      });

      const { iBlocked, blockedByPartner } = await this.blockService.getBlockDirection(
        Number(userId),
        Number(partner.id),
      );

      responses.push({
        chatId: Number(chatRoom.id),
        productId: Number(chatRoom.product.id),
        partnerName,
        partnerProfileImageUrl,
        productImageUrl,
        lastMessage,
        unreadCount,
        updatedAt: chatRoom.updatedAt,
        myConfirmed,
        partnerConfirmed,
        isBlocked: iBlocked || blockedByPartner,
        iBlocked,
        blockedByPartner,
      });
    }

    return responses.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async sendMessage(chatId: number, userId: number, content: string): Promise<ChatMessageResponse> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatId },
      relations: { seller: true, buyer: true, product: true },
    });

    if (!chatRoom) {
      throw new BusinessException('CHATROOM_NOT_FOUND');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
    }

    const chatMessage = ChatMessage.createMessage(chatRoom, user, content);
    await this.chatMessageRepository.save(chatMessage);

    const response: ChatMessageResponse = {
      messageId: Number(chatMessage.id),
      senderId: Number(user.id),
      senderProfileImageUrl: user.profileImageUrl,
      content: chatMessage.message,
      isRead: chatMessage.isRead,
      hidden: chatMessage.hidden,
      createdAt: chatMessage.createdAt,
    };

    // 웹소켓으로 실시간 브로드캐스트
    await this.bidGateway.broadcastChatMessage(chatId, response);

    return response;
  }

  async enterChatRoom(chatId: number, userId: number): Promise<ChatMessageResponse[]> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatId },
      relations: { seller: true, buyer: true },
    });

    if (!chatRoom) {
      throw new BusinessException('CHATROOM_NOT_FOUND');
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
    }

    const messages = await this.chatMessageRepository.find({
      where: { chat: { id: chatId } },
      order: { createdAt: 'ASC' },
      relations: { sender: true },
    });

    let updated = false;
    for (const message of messages) {
      if (Number(message.sender.id) !== Number(userId) && !message.isRead) {
        message.markAsRead();
        updated = true;
      }
    }

    if (updated) {
      await this.chatMessageRepository.save(messages);
    }

    return messages.map((m) => ({
      messageId: Number(m.id),
      senderId: Number(m.sender.id),
      senderProfileImageUrl: m.sender.profileImageUrl,
      content: m.message,
      isRead: m.isRead,
      hidden: m.hidden,
      createdAt: m.createdAt,
    }));
  }

  async deleteChatRoom(chatId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatId },
      relations: { seller: true, buyer: true },
    });

    if (!chatRoom) {
      throw new BusinessException('CHATROOM_NOT_FOUND');
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
    }

    chatRoom.markAsDeleted(userId);
    await this.chatRoomRepository.save(chatRoom);

    if (chatRoom.isBothDeleted()) {
      await this.chatMessageRepository.delete({ chat: { id: chatId } });
      await this.chatRoomRepository.remove(chatRoom);
    }
  }

  async sendMedia(chatId: number, userId: number, file: Express.Multer.File): Promise<ChatMessageResponse> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatId },
      relations: { seller: true, buyer: true, product: true },
    });

    if (!chatRoom) {
      throw new BusinessException('CHATROOM_NOT_FOUND');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BusinessException('USER_NOT_FOUND');
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
    }

    const mediaUrl = await this.storageService.upload(file);
    const chatMessage = ChatMessage.createMessage(chatRoom, user, mediaUrl);
    await this.chatMessageRepository.save(chatMessage);

    const response: ChatMessageResponse = {
      messageId: Number(chatMessage.id),
      senderId: Number(user.id),
      senderProfileImageUrl: user.profileImageUrl,
      content: chatMessage.message,
      isRead: chatMessage.isRead,
      hidden: chatMessage.hidden,
      createdAt: chatMessage.createdAt,
    };

    // 웹소켓으로 실시간 브로드캐스트
    await this.bidGateway.broadcastChatMessage(chatId, response);

    return response;
  }

  async completeTrade(chatId: number, userId: number): Promise<void> {
    const chatRoom = await this.chatRoomRepository.findOne({
      where: { id: chatId },
      relations: { seller: true, buyer: true, product: true },
    });

    if (!chatRoom) {
      throw new BusinessException('CHATROOM_NOT_FOUND');
    }

    if (!chatRoom.isParticipant(userId)) {
      throw new BusinessException('CHAT_ACCESS_DENIED');
    }

    if (chatRoom.product.status !== ProductStatus.ENDED) {
      throw new BusinessException('TRADE_NOT_AVAILABLE');
    }

    if (chatRoom.isAlreadyConfirmedBy(userId)) {
      throw new BusinessException('ALREADY_CONFIRMED');
    }

    chatRoom.confirmTrade(userId);

    if (chatRoom.isBothConfirmed()) {
      chatRoom.product.status = ProductStatus.TRADED;
      await this.chatRoomRepository.manager.save(chatRoom.product);
    }

    await this.chatRoomRepository.save(chatRoom);
  }
}
