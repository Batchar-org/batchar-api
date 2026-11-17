import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class ProductUpdateRequest {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @Type(() => Date)
  @IsOptional()
  endTime?: Date;

  @Transform(({ value }) => {
    // form-data로 전송될 때 배열이나 문자열 형태로 수신되는 경우를 파싱합니다.
    if (typeof value === 'string') {
      return value.split(',').map(Number);
    }
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    return undefined;
  })
  @IsInt({ each: true })
  @IsOptional()
  deleteMediaIds?: number[];
}
