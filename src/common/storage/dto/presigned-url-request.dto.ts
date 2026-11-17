import { IsNotEmpty, IsString } from 'class-validator';

export class PresignedUrlRequest {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}
