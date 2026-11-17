import { IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateNotificationSettingRequest {
  @IsBoolean()
  @IsNotEmpty()
  pushEnabled: boolean;
}
