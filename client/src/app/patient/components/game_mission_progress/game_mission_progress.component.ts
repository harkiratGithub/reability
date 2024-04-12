import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { select } from '@angular-redux/store';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs';
import { IScore } from '../../../../types';
@Component({
  selector: 'app-game-mission-progress',
  templateUrl: './game_mission_progress.component.html',
  styleUrls: ['./game_mission_progress.component.scss'],
})
export class GameMissionProgressComponent implements OnInit, OnChanges {
  @Input() stopTimer: boolean;
  @Input() scoreForTherapist;
  @Input() isTherapist;
  subscription: Subscription = new Subscription();
  percentage: number = 0;

  @select((state) => state.global.score) readonly score$: Observable<IScore>;

  constructor() {}

  ngOnInit() {
    if (this.isTherapist) {
      this.percentage = Math.floor(this.scoreForTherapist?.score?.value ?? 0);
    } else {
      this.subscription.add(
        this.score$.subscribe((score) => {
          if (!this.stopTimer) {
            this.percentage = Math.floor(score.value);
          }
        })
      );
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.scoreForTherapist?.currentValue) {
      this.percentage = Math.floor(changes.scoreForTherapist.currentValue);
    }
  }
}
