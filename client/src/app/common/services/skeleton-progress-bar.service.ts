import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkeletonProgressBarService {
  private thumbUp = new BehaviorSubject<string | null>(null);
  private progressBar = new BehaviorSubject<string | null>(null);
  private finalScore = new BehaviorSubject<string | null>(null);
  progressBarElement$ = this.progressBar.asObservable();
  thumbUpElement$ = this.thumbUp.asObservable();
  scoreElement$ = this.finalScore.asObservable();

  setBarElement(data: string | null): void {
    this.progressBar.next(data);
  }

  setThumbUpElement(data: string | null): void {
    this.thumbUp.next(data);
  }

  setScoreElement(data: string | null): void {
    this.finalScore.next(data);
  }
}
