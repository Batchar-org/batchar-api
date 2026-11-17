import { IsEmail, IsNotEmpty } from 'class-validator';

export class PasswordResetRequest {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
