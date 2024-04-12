import { Component, OnInit, AfterViewInit } from '@angular/core';
@Component({
  selector: 'app-end-game',
  templateUrl: './end_game.component.html',
  styleUrls: ['./end_game.component.scss'],
})
export class EndGameComponent implements OnInit, AfterViewInit {
  secondsLeft: number = 5;

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.changeSecondsLeft();
  }

  changeSecondsLeft = () => {
    const secondsLeft = setInterval(() => {
      if (this.secondsLeft == 1) {
        clearInterval(secondsLeft);
      }
      this.secondsLeft--;
    }, 1000);
  };
}
