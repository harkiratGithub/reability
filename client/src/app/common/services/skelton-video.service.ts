import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkeltonVideoService {

  // private iframeUrlSubject = new BehaviorSubject<string | null>(null);
  //iframeUrl$ = this.iframeUrlSubject.asObservable();

  private gameVideoElementSubject = new BehaviorSubject<string | null>(null);
  gameVideoElement$ = this.gameVideoElementSubject.asObservable();

  setGameVideoElement(iframeaction: string | null): void {
    // console.log("=======IframeVideoaction==", iframeaction);
    this.gameVideoElementSubject.next(iframeaction);
  }

  getGameVideoElement(): string | null {
    return this.gameVideoElementSubject.value;
  }
  /*setIframeUrl(url: string | null): void {
    console.log(" iframe url ====", url);
    this.iframeUrlSubject.next(url);
  }

  getIframeUrl(): string | null {
    return this.iframeUrlSubject.value;
  }
    */
}
