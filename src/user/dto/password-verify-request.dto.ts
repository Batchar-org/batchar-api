import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordVerifyRequest {
  @IsString()
  @IsNotEmpty()
  password: string;
}
