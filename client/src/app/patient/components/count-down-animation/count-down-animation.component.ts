import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-count-down-animation',
  templateUrl: './count-down-animation.component.html',
  styleUrls: ['./count-down-animation.component.scss']
})
export class CountDownAnimationComponent implements OnInit {
  interval;
  @Input() countDownTotal;
  @Output() countDownFinished = new EventEmitter();

  constructor() {}

  ngOnInit() {
    this.startCountDown();
  }

  startCountDown() {
    this.interval = setInterval(() => {
      this.countDown();
    }, 1500);
  }
  countDown() {
    this.countDownTotal -= 1;
    if (this.countDownTotal === 0) {
      this.onCountDownFinished();
    }
  }

  onCountDownFinished() {
    this.countDownFinished.emit();
    clearInterval(this.interval);
  }
}
