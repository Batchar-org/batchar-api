import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Inject, forwardRef, Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat/chat.service';
import { BidBroadcast } from '../bid/dto/bid.dto';
import { ChatMessageResponse } from '../chat/dto/chat.dto';

interface StompFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

interface Subscription {
  id: string;
  destination: string;
}

@WebSocketGateway({ path: '/ws' })
@Injectable()
export class BidGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(BidGateway.name);

  @WebSocketServer()
  server: Server;

  // 소켓별 구독 정보를 관리하는 맵
  private readonly clientSubscriptions = new Map<WebSocket, Subscription[]>();
  // 소켓별 인증된 사용자 ID
  private readonly clientUsers = new Map<WebSocket, number>();

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized with WsAdapter');
  }

  handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log('Client connected to WebSocket');
    this.clientSubscriptions.set(client, []);

    client.on('message', async (data: any) => {
      let rawMessage = '';
      if (Buffer.isBuffer(data)) {
        rawMessage = data.toString('utf8');
      } else if (typeof data === 'string') {
        rawMessage = data;
      }

      try {
        const frame = this.parseStompFrame(rawMessage);
        if (!frame) return;

        await this.handleStompFrame(client, frame);
      } catch (err) {
        this.logger.error('Failed to handle STOMP frame', err);
        this.sendErrorFrame(client, 'Failed to process message', err.message);
      }
    });
  }

  handleDisconnect(client: WebSocket) {
    this.logger.log('Client disconnected');
    this.clientSubscriptions.delete(client);
    this.clientUsers.delete(client);
  }

  // STOMP 프레임 파싱
  private parseStompFrame(raw: string): StompFrame | null {
    // null byte (\x00) 로 끝나는 부분 제거
    const cleaned = raw.replace(/\0$/, '').trim();
    if (!cleaned) return null;

    const lines = cleaned.split(/\r?\n/);
    if (lines.length === 0 || !lines[0].trim()) return null;

    const command = lines[0].trim();
    const headers: Record<string, string> = {};
    let i = 1;
    while (i < lines.length && lines[i].trim() !== '') {
      const line = lines[i];
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).trim();
        headers[key] = val;
      }
      i++;
    }

    const bodyLines = lines.slice(i + 1);
    const body = bodyLines.join('\n');

    return { command, headers, body };
  }

  // STOMP 프레임 빌드
  private buildStompFrame(command: string, headers: Record<string, string>, body = ''): string {
    let frame = `${command}\n`;
    for (const [key, val] of Object.entries(headers)) {
      frame += `${key}:${val}\n`;
    }
    frame += `\n${body}\0`;
    return frame;
  }

  // 에러 프레임 전송
  private sendErrorFrame(client: WebSocket, message: string, detail?: string) {
    const headers: Record<string, string> = {
      message,
    };
    if (detail) {
      headers['detail'] = detail;
    }
    const frame = this.buildStompFrame('ERROR', headers);
    if (client.readyState === WebSocket.OPEN) {
      client.send(frame);
    }
  }

  // STOMP 프레임 분기 처리
  private async handleStompFrame(client: WebSocket, frame: StompFrame) {
    const { command, headers, body } = frame;
    this.logger.log(`Received STOMP Command: ${command}`);

    switch (command) {
      case 'CONNECT': {
        // Authorization header 검증
        const authHeader = headers['Authorization'] || headers['authorization'] || headers['passcode']; 
        if (!authHeader) {
          this.sendErrorFrame(client, 'Missing credentials', 'Authorization header is required');
          client.close();
          return;
        }

        const token = authHeader.replace(/^Bearer\s+/i, '');
        try {
          const payload = this.jwtService.verify(token);
          const userId = Number(payload.sub);
          this.clientUsers.set(client, userId);
          this.logger.log(`Client authenticated. UserID: ${userId}`);

          // CONNECTED 응답 프레임 발송
          const connectedFrame = this.buildStompFrame('CONNECTED', {
            version: '1.1',
            'heart-beat': '0,0',
          });
          client.send(connectedFrame);
        } catch (err) {
          this.logger.error('JWT Token verification failed in WebSocket CONNECT', err);
          this.sendErrorFrame(client, 'Authentication failed', 'Invalid token');
          client.close();
        }
        break;
      }

      case 'SUBSCRIBE': {
        const destination = headers['destination'];
        const id = headers['id'] || destination;
        if (!destination) {
          this.sendErrorFrame(client, 'Missing destination', 'SUBSCRIBE requires destination header');
          return;
        }

        const subs = this.clientSubscriptions.get(client) || [];
        if (!subs.some((s) => s.id === id)) {
          subs.push({ id, destination });
          this.clientSubscriptions.set(client, subs);
          this.logger.log(`Client subscribed to ${destination} (SubID: ${id})`);
        }
        break;
      }

      case 'UNSUBSCRIBE': {
        const id = headers['id'];
        if (!id) {
          this.sendErrorFrame(client, 'Missing subscription ID', 'UNSUBSCRIBE requires id header');
          return;
        }

        const subs = this.clientSubscriptions.get(client) || [];
        this.clientSubscriptions.set(
          client,
          subs.filter((s) => s.id !== id),
        );
        this.logger.log(`Client unsubscribed (SubID: ${id})`);
        break;
      }

      case 'SEND': {
        const destination = headers['destination'];
        if (!destination) {
          this.sendErrorFrame(client, 'Missing destination', 'SEND requires destination header');
          return;
        }

        // /app/chat/{chatId} 혹은 /chat/{chatId} 목적지
        const chatMatch = destination.match(/^\/?(?:app\/)?chat\/(\d+)$/);
        if (chatMatch) {
          const chatId = parseInt(chatMatch[1], 10);
          const userId = this.clientUsers.get(client);
          if (!userId) {
            this.sendErrorFrame(client, 'Unauthenticated', 'Please CONNECT first');
            return;
          }

          try {
            const parsedBody = JSON.parse(body);
            const content = parsedBody.message;
            if (!content) {
              this.sendErrorFrame(client, 'Empty message', 'message property is required in JSON body');
              return;
            }

            // 비즈니스 로직 연동 (메시지 저장 및 내부에서 broadcastChatMessage 호출)
            await this.chatService.sendMessage(chatId, userId, content);
          } catch (err) {
            this.logger.error(`Failed to handle SEND for destination ${destination}`, err);
            this.sendErrorFrame(client, 'Message transmission failed', err.message);
          }
        } else {
          this.sendErrorFrame(client, 'Invalid destination', `SEND destination ${destination} is not supported`);
        }
        break;
      }

      case 'DISCONNECT': {
        this.logger.log('Client requested DISCONNECT');
        client.close();
        break;
      }

      default:
        this.sendErrorFrame(client, 'Unknown command', `STOMP command ${command} is not supported`);
        break;
    }
  }

  // 입찰 발생 시 실시간 브로드캐스트
  async broadcastBid(productId: number, data: BidBroadcast): Promise<void> {
    const destination = `/topic/products/${productId}`;
    this.logger.log(`Broadcasting bid to ${destination}`);

    const snakeCasedData = {
      product_id: Number(data.productId),
      current_price: Number(data.currentPrice),
      bidder_name: data.bidderName,
    };

    this.broadcastToTopic(destination, snakeCasedData);
  }

  // 채팅 메시지 전송 시 실시간 브로드캐스트
  async broadcastChatMessage(chatId: number, data: ChatMessageResponse): Promise<void> {
    const destination = `/topic/chat/${chatId}`;
    this.logger.log(`Broadcasting chat message to ${destination}`);

    const snakeCasedData = {
      message_id: Number(data.messageId),
      sender_id: Number(data.senderId),
      sender_profile_image_url: data.senderProfileImageUrl,
      content: data.content,
      is_read: data.isRead,
      created_at: data.createdAt,
    };

    this.broadcastToTopic(destination, snakeCasedData);
  }

  // 토픽 구독 중인 소켓 클라이언트들에게 메시지 브로드캐스트
  private broadcastToTopic(destination: string, payload: any) {
    const payloadStr = JSON.stringify(payload);

    for (const [client, subs] of this.clientSubscriptions.entries()) {
      if (client.readyState !== WebSocket.OPEN) continue;

      for (const sub of subs) {
        if (sub.destination === destination) {
          const frame = this.buildStompFrame(
            'MESSAGE',
            {
              destination,
              'content-type': 'application/json',
              subscription: sub.id,
              'message-id': `msg-${Math.random().toString(36).substring(2, 9)}`,
            },
            payloadStr,
          );
          client.send(frame);
        }
      }
    }
  }
}
