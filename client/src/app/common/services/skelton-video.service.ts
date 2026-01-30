import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkeltonVideoService {
  private gameVideoElementSubject = new BehaviorSubject<string | object | null>(null);
  gameVideoElement$ = this.gameVideoElementSubject.asObservable();

  setGameVideoElement(iframeaction: string | object | null): void {
    this.gameVideoElementSubject.next(iframeaction);
  }

  getGameVideoElement(): string | object | null {
    return this.gameVideoElementSubject.value;
  }
}
