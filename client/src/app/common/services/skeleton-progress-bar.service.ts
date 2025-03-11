import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkeletonProgressBarService {
  private thumbUp = new BehaviorSubject<string | null>(null);
  private progressBar = new BehaviorSubject<string | null>(null);
  progressBarElement$ = this.progressBar.asObservable();
  thumbUpElement$ = this.thumbUp.asObservable();

  setBarElement(data: string | null): void {
    this.progressBar.next(data);
  }

  getBarElement(): string | null {
    return this.progressBar.value;
  }

  setThumbUpElement(data: string | null): void {
    this.thumbUp.next(data);
  }

  getThumbUpElement(): string | null {
    return this.thumbUp.value;
  }
}
