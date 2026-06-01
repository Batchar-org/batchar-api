import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { StorageModule } from '../common/storage/storage.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMessage]),
    forwardRef(() => UserModule),
    forwardRef(() => ProductModule),
    StorageModule,
    forwardRef(() => WebSocketModule),
    BlockModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService, TypeOrmModule],
})
export class ChatModule {}
