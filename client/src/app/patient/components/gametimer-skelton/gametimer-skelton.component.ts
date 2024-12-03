import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { select } from '@angular-redux/store';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs';

import { AppActions } from '../../../app.actions';
import { IGameAppData } from '../../../app.state';
@Component({
  selector: 'app-gametimer-skelton',
  templateUrl: './gametimer-skelton.component.html',
  styleUrls: ['./gametimer-skelton.component.scss']
})
export class GametimerSkeltonComponent implements OnInit {

  subscription: Subscription = new Subscription();
  timerInterval: any = null;
  minutes: string = '00';
  seconds: string = '00';
  totalInGameSeconds: number = 0;

  @select((state) => state.global.stopTimer) readonly stopTimer$: Observable<boolean>;

  constructor(private appActions: AppActions) {}

  ngOnInit() {
    this.subscription.add(
      this.stopTimer$.subscribe((stopTimer) => {
        if (stopTimer) {
          clearInterval(this.timerInterval);
        }
      })
    );
  }

  ngAfterViewInit() {
    this.timerInterval = setInterval(() => {
      this.totalInGameSeconds++;
      this.appActions.setCurrentGameAppData({ timeInSeconds: this.totalInGameSeconds });
      const toSeconds = this.totalInGameSeconds % 60;
      const toMinutes = Math.floor(this.totalInGameSeconds / 60);
      this.seconds = (toSeconds + '').length < 2 ? `0${toSeconds}` : `${toSeconds}`;
      this.minutes = (toMinutes + '').length < 2 ? `0${toMinutes}` : `${toMinutes}`;
    }, 1000);
  }

  ngOnDestroy() {
    clearInterval(this.timerInterval);
    this.appActions.setCurrentGameAppData({ timeInSeconds: 0 });
  }

}
