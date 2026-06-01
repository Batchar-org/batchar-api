import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Optional 가드 통과 시 request.user가 없을 수 있으므로 삼항식으로 안전하게 처리
    return request.user ? request.user.id : null;
  },
);
