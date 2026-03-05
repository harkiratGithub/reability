import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SkeletonProgressBarService {
  private thumbUp = new BehaviorSubject<string | null>(null);
  private finalScore = new BehaviorSubject<string | null>(null);
  private progressBar = new BehaviorSubject<string | null>(null);
  private showProgressBar = new BehaviorSubject<string | null>(null);

  thumbUpElement$ = this.thumbUp.asObservable();
  scoreElement$ = this.finalScore.asObservable();
  progressBarElement$ = this.progressBar.asObservable();
  showProgressBarElement$ = this.showProgressBar.asObservable();

  setThumbUpElement(data: string | null): void {
    this.thumbUp.next(data);
  }

  setScoreElement(data: string | null): void {
    this.finalScore.next(data);
  }

  setBarElement(data: string | null): void {
    this.progressBar.next(data);
  }

  setShowProgressBar(data: string | null): void {
    this.showProgressBar.next(data);
  }
}
