import { Controller, Sse, Param } from '@nestjs/common';
import { Observable } from 'rxjs';

import { SseService, MessageEvent } from '../service/sse.service';

@Controller('api/products/:productId')
export class ProductSseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('subscribe')
  subscribe(@Param('productId') productId: number): Observable<MessageEvent> {
    return this.sseService.subscribe(Number(productId));
  }
}
