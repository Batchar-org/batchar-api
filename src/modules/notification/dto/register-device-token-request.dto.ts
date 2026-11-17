import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceTokenRequest {
  @IsString()
  @IsNotEmpty()
  token: string;
}
