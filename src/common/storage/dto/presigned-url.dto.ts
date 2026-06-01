import { IsNotEmpty, IsString } from 'class-validator';

export class PresignedUrlRequest {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}

export class PresignedUrlResponse {
  presignedUrl: string;

  objectUrl: string;
}
