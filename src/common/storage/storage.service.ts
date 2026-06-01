import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignedUrlRequest, PresignedUrlResponse } from './dto/presigned-url.dto';
import { BusinessException } from '../exceptions/business.exception';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private readonly logger = new Logger(StorageService.name);

  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly region: string;
  private readonly expiration: number;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'batchar-bucket';
    this.endpoint = process.env.S3_ENDPOINT || 'http://localhost:4566';
    this.region = process.env.S3_REGION || 'us-east-1';
    this.expiration = parseInt(process.env.S3_PRESIGNED_EXPIRATION || '3600', 10);

    const s3Config: any = {
      region: this.region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'mock-access-key',
        secretAccessKey: process.env.S3_SECRET_KEY || 'mock-secret-key',
      },
    };

    if (this.endpoint) {
      s3Config.endpoint = this.endpoint;
      s3Config.forcePathStyle = true; // Localstack 등의 로컬 S3 호환용
    }

    this.s3Client = new S3Client(s3Config);
  }

  async upload(file: Express.Multer.File): Promise<string> {
    try {
      const originalName = file.originalname;
      const ext = originalName.substring(originalName.lastIndexOf('.'));
      const today = new Date().toISOString().split('T')[0];
      const key = `${today}/${uuidv4()}${ext}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `${this.endpoint}/${this.bucket}/${key}`;
    } catch (e) {
      this.logger.error('S3 upload failed', e);
      throw new BusinessException('FILE_UPLOAD_FAILED');
    }
  }

  async delete(mediaUrl: string): Promise<void> {
    try {
      const prefix = `${this.endpoint}/${this.bucket}/`;
      if (!mediaUrl.startsWith(prefix)) {
        return;
      }
      const key = mediaUrl.substring(prefix.length);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (e) {
      this.logger.error('S3 delete failed', e);
    }
  }

  async generatePresignedUrl(request: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    try {
      const ext = request.fileName.substring(request.fileName.lastIndexOf('.'));
      const today = new Date().toISOString().split('T')[0];
      const key = `${today}/${uuidv4()}${ext}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: request.contentType,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.expiration,
      });

      const objectUrl = `${this.endpoint}/${this.bucket}/${key}`;

      return { presignedUrl, objectUrl };
    } catch (e) {
      this.logger.error('Generate Presigned URL failed', e);
      throw new BusinessException('FILE_UPLOAD_FAILED');
    }
  }
}
