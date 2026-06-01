import { HttpException } from '@nestjs/common';
import { ErrorCodeKey, ErrorCode } from './error-code';

export class BusinessException extends HttpException {
  public readonly errorCodeKey: ErrorCodeKey;

  constructor(errorCodeKey: ErrorCodeKey) {
    const detail = ErrorCode[errorCodeKey];
    super(detail.message, detail.httpStatus);
    this.errorCodeKey = errorCodeKey;
  }
}
