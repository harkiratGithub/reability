import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertSubject = new BehaviorSubject<string | null>(null);
  compAlert$ = this.alertSubject.asObservable();

  private clearTimeoutId: any = null;
  private CLEAR_MS = 5000;

  /** Show an alert locally (will auto-clear after 5s) */
  showAlert(message: string | null) {
    if (!message) return;
    // push
    this.alertSubject.next(message);

    // reset any existing clear timer
    if (this.clearTimeoutId) clearTimeout(this.clearTimeoutId);

    // auto-clear after CLEAR_MS
    this.clearTimeoutId = setTimeout(() => {
      this.alertSubject.next(null);
      this.clearTimeoutId = null;
    }, this.CLEAR_MS);
  }

  /** Clear immediately */
  clear() {
    if (this.clearTimeoutId) clearTimeout(this.clearTimeoutId);
    this.clearTimeoutId = null;
    this.alertSubject.next(null);
  }
}
