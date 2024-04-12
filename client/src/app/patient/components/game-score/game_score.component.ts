import { Component, OnInit, OnChanges, Input, SimpleChanges } from '@angular/core';
import { select } from '@angular-redux/store';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs';
import { IScore } from '../../../../types';
@Component({
  selector: 'app-game-score',
  templateUrl: './game_score.component.html',
  styleUrls: ['./game_score.component.scss'],
})
export class GameScoreComponent implements OnInit, OnChanges {
  @Input() stopTimer: boolean;
  @Input() scoreForTherapist;
  @Input() isTherapist;
  subscription: Subscription = new Subscription();
  pointsEarned = '';

  @select((state) => state.global.score) readonly score$: Observable<IScore>;

  constructor() {}

  ngOnInit() {
    if (!this.isTherapist) {
      this.subscription.add(
        this.score$.subscribe((score) => {
          if (!this.stopTimer) {
            this.pointsEarned = score.value;
          }
        })
      );
    } else {
      this.pointsEarned = this.scoreForTherapist;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.scoreForTherapist?.currentValue) {
      this.pointsEarned = changes.scoreForTherapist.currentValue;
    }
  }
}
