import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StorageModule } from '../../infra/storage/storage.module';

import { BlockModule } from '../block/block.module';
import { Product } from '../product/entities/product.entity';
import { ProductModule } from '../product/product.module';
import { ProductRepository } from '../product/repository/product.repository';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repository/user.repository';
import { UserModule } from '../user/user.module';
import { WebSocketModule } from '../websocket/websocket.module';

import { ChatController } from './controller/chat.controller';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessageRepository } from './repository/chat-message.repository';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { ChatService } from './service/chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMessage, User, Product]),
    forwardRef(() => UserModule),
    forwardRef(() => ProductModule),
    StorageModule,
    forwardRef(() => WebSocketModule),
    BlockModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRoomRepository,
    ChatMessageRepository,
    UserRepository,
    ProductRepository,
  ],
  exports: [ChatService, TypeOrmModule],
})
export class ChatModule {}
