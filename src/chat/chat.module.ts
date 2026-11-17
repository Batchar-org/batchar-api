import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './service/chat.service';
import { ChatController } from './controller/chat.controller';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { StorageModule } from '../common/storage/storage.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { BlockModule } from '../block/block.module';
import { User } from '../user/entities/user.entity';
import { Product } from '../product/entities/product.entity';
import { ChatRoomRepository } from './repository/chat-room.repository';
import { ChatMessageRepository } from './repository/chat-message.repository';
import { UserRepository } from '../user/repository/user.repository';
import { ProductRepository } from '../product/repository/product.repository';

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
