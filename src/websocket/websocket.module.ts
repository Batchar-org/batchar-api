import { Module, forwardRef } from '@nestjs/common';
import { BidGateway } from './bid.gateway';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => ChatModule),
  ],
  providers: [BidGateway],
  exports: [BidGateway],
})
export class WebSocketModule {}
