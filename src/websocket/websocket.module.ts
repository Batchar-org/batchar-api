import { Module, forwardRef } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

import { BidGateway } from './gateway/bid.gateway';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => ChatModule)],
  providers: [BidGateway],
  exports: [BidGateway],
})
export class WebSocketModule {}
