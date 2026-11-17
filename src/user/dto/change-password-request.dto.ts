import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ChangePasswordRequest {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 100)
  newPassword: string;
}
