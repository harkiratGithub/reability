import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Joint {
  x: number;
  y: number;
  visibility?: number;
  index: number;
}

export interface Connection {
  start: number; // index of starting joint
  end: number;   // index of ending joint
  color: string; // final strokeStyle you used
}

export interface SkeletonFrame {
  joints: Joint[];
  connections: Connection[];
}

@Injectable({
  providedIn: 'root'
})
export class SkeletonService {
  private skeletonSubject = new BehaviorSubject<SkeletonFrame | null>(null);
  skeleton$ = this.skeletonSubject.asObservable();

  updateSkeleton(frame: SkeletonFrame) {
    this.skeletonSubject.next(frame);
  }
}
