import { HttpException } from '@nestjs/common';
import { ErrorCodeKey, ErrorCode } from './error-code';

export class BusinessException extends HttpException {
  public readonly errorCodeKey: ErrorCodeKey;
  public readonly details?: Record<string, unknown>;

  constructor(errorCodeKey: ErrorCodeKey, details?: Record<string, unknown>) {
    const detail = ErrorCode[errorCodeKey];
    super(detail.message, detail.httpStatus);
    this.errorCodeKey = errorCodeKey;
    this.details = details;
  }
}
