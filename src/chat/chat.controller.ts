import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ChatMessageRequest } from './dto/chat.dto';

@Controller('api/chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @HttpCode(200)
  async getChatLists(@CurrentUser() userId: number) {
    const data = await this.chatService.getChatLists(userId);
    return {
      data,
      message: '채팅 목록을 조회했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':chatId/messages')
  @HttpCode(201)
  async sendMessage(
    @Param('chatId', ParseIntPipe) chatId: number,
    @CurrentUser() userId: number,
    @Body() request: ChatMessageRequest,
  ) {
    const data = await this.chatService.sendMessage(chatId, userId, request.message);
    return {
      data,
      message: '메시지를 전송했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':chatId/messages')
  @HttpCode(200)
  async enterChatRoom(
    @Param('chatId', ParseIntPipe) chatId: number,
    @CurrentUser() userId: number,
  ) {
    const data = await this.chatService.enterChatRoom(chatId, userId);
    return {
      data,
      message: '채팅방에 입장했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':chatId')
  @HttpCode(200)
  async deleteChatRoom(
    @Param('chatId', ParseIntPipe) chatId: number,
    @CurrentUser() userId: number,
  ) {
    await this.chatService.deleteChatRoom(chatId, userId);
    return {
      data: null,
      message: '채팅방에서 나갔습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':chatId/media')
  @HttpCode(201)
  async sendMedia(
    @Param('chatId', ParseIntPipe) chatId: number,
    @CurrentUser() userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.chatService.sendMedia(chatId, userId, file);
    return {
      data,
      message: '미디어를 전송했습니다.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':chatId/complete')
  @HttpCode(200)
  async completeTrade(
    @Param('chatId', ParseIntPipe) chatId: number,
    @CurrentUser() userId: number,
  ) {
    await this.chatService.completeTrade(chatId, userId);
    return {
      data: null,
      message: '거래 완료를 확정했습니다.',
    };
  }
}
