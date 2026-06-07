import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCode } from '../exceptions/error-code';

type ValidationErrorDetail = { field: string; message: string };
type HttpErrorResponseBody = {
  message?: string | string[];
};
type RequestWithId = Request & { id?: string };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message: string = ErrorCode.INTERNAL_SERVER_ERROR.message;
    let details: ValidationErrorDetail[] | Record<string, unknown> | null =
      null;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.errorCodeKey;
      message = exception.message;
      details = exception.details ?? null;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      const resMessage = this.getResponseMessage(resContent);

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(resMessage)) {
        // class-validator 유효성 검증 에러 처리 (Spring Boot의 MethodArgumentNotValidException 모방)
        code = 'INVALID_INPUT_VALUE';
        message = ErrorCode.INVALID_INPUT_VALUE.message;
        details = this.formatValidationErrors(resMessage);
      } else if (status === HttpStatus.METHOD_NOT_ALLOWED) {
        code = 'METHOD_NOT_ALLOWED';
        message = ErrorCode.METHOD_NOT_ALLOWED.message;
      } else {
        // 기타 HttpException
        code = this.getHttpErrorCodeName(status);
        message =
          typeof resContent === 'string'
            ? resContent
            : typeof resMessage === 'string'
              ? resMessage
              : exception.message;
      }
    } else {
      // 알 수 없는 일반 시스템 에러
      this.logger.error(
        'Unhandled Exception occurred',
        exception instanceof Error
          ? exception.stack || exception.message
          : exception,
      );
    }

    const errorResponse = {
      code,
      message,
      ...(details ? { details } : {}),
      // 프론트엔드가 실패한 요청을 서버 로그에서 추적할 수 있도록 요청 ID를 함께 내려준다.
      request_id: request.id,
    };

    response.status(status).json(errorResponse);
  }

  // class-validator에서 오는 ['email must be an email', 'name should not be empty'] 형식의 에러 문자열을 정제합니다.
  private formatValidationErrors(messages: string[]): ValidationErrorDetail[] {
    return messages.map((msg) => {
      // 대략적인 필드명 파싱 (첫 단어가 보통 필드명이므로 매핑 시도)
      const firstWord = msg.split(' ')[0] || '';
      return {
        field: firstWord,
        message: msg,
      };
    });
  }

  private getResponseMessage(
    responseBody: string | object,
  ): string | string[] | undefined {
    if (typeof responseBody === 'string') return responseBody;
    if (!this.hasMessage(responseBody)) return undefined;
    return responseBody.message;
  }

  private hasMessage(
    responseBody: object,
  ): responseBody is HttpErrorResponseBody {
    return 'message' in responseBody;
  }

  private getHttpErrorCodeName(status: HttpStatus): string {
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
