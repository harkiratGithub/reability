import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GameSettingsService {
  private gameSettingsSubject = new BehaviorSubject<any>(null);
  public gameSettings$ = this.gameSettingsSubject.asObservable();

  setGameSettings(settings: any) {
    this.gameSettingsSubject.next(settings);
  }
}

