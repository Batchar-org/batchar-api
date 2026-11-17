import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SseService {
  private emitters = new Map<number, Subject<MessageEvent['data']>>();

  subscribe(productId: number): Observable<MessageEvent> {
    if (!this.emitters.has(productId)) {
      this.emitters.set(productId, new Subject<MessageEvent['data']>());
    }
    return this.emitters
      .get(productId)!
      .asObservable()
      .pipe(map((data): MessageEvent => ({ data })));
  }

  send(productId: number, data: MessageEvent['data']) {
    const emitter = this.emitters.get(productId);
    if (emitter) {
      emitter.next(data);
    }
  }
}
export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}
