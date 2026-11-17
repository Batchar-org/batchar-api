import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

import { BusinessException } from '../exceptions/business.exception';

/**
 * `@Param('xxxId') id: number`로 선언된 경로 변수가 숫자가 아니면 400(INVALID_PATH_VARIABLE).
 * ValidationPipe의 transform은 'abc'를 NaN으로 바꿔 그대로 통과시켜 DB에서 500이 나므로,
 * 전역 파이프로 ValidationPipe보다 먼저 검사한다. (Spring의 MethodArgumentTypeMismatchException 대응)
 */
@Injectable()
export class NumericParamPipe implements PipeTransform {
  transform(value: unknown, { type, metatype }: ArgumentMetadata) {
    if (
      type === 'param' &&
      metatype === Number &&
      !(/^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)))
    ) {
      throw new BusinessException('INVALID_PATH_VARIABLE');
    }
    return value;
  }
}
