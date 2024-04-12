import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'game-message',
  templateUrl: './game-message.component.html',
  styleUrls: ['./game-message.component.scss'],
})
export class GameMessageComponent implements OnInit {
  constructor() {}

  @Input() gameMessage: string;
  ngOnInit(): void {}
}
