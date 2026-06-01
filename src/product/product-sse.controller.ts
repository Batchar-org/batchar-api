import { Controller, Sse, Param } from '@nestjs/common';
import { SseService, MessageEvent } from './sse/sse.service';
import { Observable } from 'rxjs';

@Controller('api/products/:productId')
export class ProductSseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('subscribe')
  subscribe(@Param('productId') productId: number): Observable<MessageEvent> {
    return this.sseService.subscribe(Number(productId));
  }
}
