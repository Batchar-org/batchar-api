import { IsNotEmpty, IsString } from 'class-validator';

export class ChatMessageRequest {
  @IsString()
  @IsNotEmpty()
  message: string;
}
