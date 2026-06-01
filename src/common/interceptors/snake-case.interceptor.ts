import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import snakecaseKeys from 'snakecase-keys';
import camelcaseKeys from 'camelcase-keys';

@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // 1. 들어오는 요청 객체(Body, Query)의 키를 snake_case에서 camelCase로 변환
    if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
      // Multipart/Form-data 파일 등 변환이 불필요한 특수 객체 필터링
      const parsedBody = this.cleanObjectForCamelcase(request.body);
      request.body = camelcaseKeys(parsedBody, { deep: true });
    }

    // Express 5의 req.query는 getter-only이므로 defineProperty로 우회
    if (request.query && typeof request.query === 'object' && Object.keys(request.query).length > 0) {
      const camelQuery = camelcaseKeys(request.query, { deep: true });
      Object.defineProperty(request, 'query', {
        value: camelQuery,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    // 2. 나가는 응답 객체의 키를 camelCase에서 snake_case로 변환
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object') {
          return snakecaseKeys(data, { deep: true });
        }
        return data;
      }),
    );
  }

  // Multer File과 같이 바이너리 버퍼나 스트림을 담고 있을 수 있는 특수 데이터 필드들을 제외한 객체를 정제합니다.
  private cleanObjectForCamelcase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanObjectForCamelcase(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const cleanObj: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        // Buffer 객체나 file 필드는 원본을 유지합니다.
        if (val && (Buffer.isBuffer(val) || val.buffer || typeof val.pipe === 'function' || val.fieldname)) {
          cleanObj[key] = val;
        } else {
          cleanObj[key] = this.cleanObjectForCamelcase(val);
        }
      }
      return cleanObj;
    }
    return obj;
  }
}
