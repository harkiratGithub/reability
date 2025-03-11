import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkeltonVideoService {
  private gameVideoElementSubject = new BehaviorSubject<string | null>(null);
  gameVideoElement$ = this.gameVideoElementSubject.asObservable();

  setGameVideoElement(iframeaction: string | null): void {
    this.gameVideoElementSubject.next(iframeaction);
  }

  getGameVideoElement(): string | null {
    return this.gameVideoElementSubject.value;
  }
}
