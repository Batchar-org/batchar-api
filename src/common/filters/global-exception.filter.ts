import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-code';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message: string = ErrorCode.INTERNAL_SERVER_ERROR.message;
    let details: { field: string; message: string }[] | null = null;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.errorCodeKey;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent: any = exception.getResponse();

      if (status === HttpStatus.BAD_REQUEST && resContent && Array.isArray(resContent.message)) {
        // class-validator 유효성 검증 에러 처리 (Spring Boot의 MethodArgumentNotValidException 모방)
        code = 'INVALID_INPUT_VALUE';
        message = ErrorCode.INVALID_INPUT_VALUE.message;
        details = this.formatValidationErrors(resContent.message);
      } else if (status === HttpStatus.METHOD_NOT_ALLOWED) {
        code = 'METHOD_NOT_ALLOWED';
        message = ErrorCode.METHOD_NOT_ALLOWED.message;
      } else {
        // 기타 HttpException
        code = this.getHttpErrorCodeName(status);
        message = typeof resContent === 'string' ? resContent : resContent.message || exception.message;
      }
    } else {
      // 알 수 없는 일반 시스템 에러
      this.logger.error('Unhandled Exception occurred', exception.stack || exception);
    }

    const errorResponse = {
      code,
      message,
      ...(details ? { details } : {}),
    };

    response.status(status).json(errorResponse);
  }

  // class-validator에서 오는 ['email must be an email', 'name should not be empty'] 형식의 에러 문자열을 정제합니다.
  private formatValidationErrors(messages: string[]): { field: string; message: string }[] {
    return messages.map((msg) => {
      // 대략적인 필드명 파싱 (첫 단어가 보통 필드명이므로 매핑 시도)
      const firstWord = msg.split(' ')[0] || '';
      return {
        field: firstWord,
        message: msg,
      };
    });
  }

  private getHttpErrorCodeName(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'INVALID_INPUT_VALUE';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.METHOD_NOT_ALLOWED:
        return 'METHOD_NOT_ALLOWED';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
