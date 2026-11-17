import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailVerifyCodeRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
