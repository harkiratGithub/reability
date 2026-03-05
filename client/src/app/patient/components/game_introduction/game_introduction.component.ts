import { Component, OnInit, OnChanges, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { select } from '@angular-redux/store';
import { Subscription, Observable } from 'rxjs';

import { AppActions } from '../../../../app/app.actions';
import { communicationUtil, MESSAGES } from '../../../common/services/communication_util.service';

@Component({
  selector: 'app-game-intro',
  templateUrl: './game_introduction.component.html',
  styleUrls: ['./game_introduction.component.scss'],
})
export class GameIntroductionComponent implements OnInit, OnChanges {
  subscription: Subscription = new Subscription();
  loadingBarPercentage: number = 0;
  introTypes: any = [];
  isShowMsg: boolean = false;
  message: string = 'Still loading...';
  secondMsg: string = 'A few more seconds, first load takes a bit longer...';
  iframeEl;
  gotGameSettings: boolean = false;

  @select((state) => state.global.currentGameName) readonly currentGameName$: Observable<string>;
  @select((state) => state.global.initGameSettings) readonly initGameSettings$: Observable<object>;

  @Input() currentGameDescription: string;
  @Input() currentGameName: any;
  @Input() isGameReadyToStart = false;
  @Input() connectionId = '';
  @Input() isTherapistMode = false;
  @Input() initGameSettingsForTherapist;
  @Input() isMobile = false;

  @Output() onClickHomeButton: EventEmitter<any> = new EventEmitter();
  @Output() introductionProgressEnded: EventEmitter<any> = new EventEmitter();
  @Output() sendShowTimerForTherapist: EventEmitter<any> = new EventEmitter();

  constructor(private appActions: AppActions) {}

  ngOnInit() {
    if (!this.isTherapistMode) {
      this.subscription.add(
        this.initGameSettings$.subscribe((initGameSettings) => {
          this.handleIntroTypes(initGameSettings);
        })
      );
    }

    const loadingBarInterval = setInterval(() => {
      if (this.introTypes.length > 0) {
        if (!this.gotGameSettings) {
          this.gotGameSettings = true;
        }
        this.loadingBarPercentage += 20;
      }
      if (this.loadingBarPercentage == 100) {
        this.iframeEl = document.getElementById('games-iframe-' + this.connectionId);
        communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_INTRODUCTION_DONE);
        clearInterval(loadingBarInterval);
        if (this.isGameReadyToStart) {
          if (!this.isTherapistMode) {
            this.appActions.showTimer(true);
          } else {
            this.sendShowTimerForTherapist.emit(true);
          }
        } else {
          this.introductionProgressEnded.emit(true);
        }
      }
    }, 1000);
    setTimeout(() => {
      this.isShowMsg = true;
    }, 5000);
    setTimeout(() => {
      this.message = this.secondMsg;
    }, 10000);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes.initGameSettingsForTherapist?.currentValue &&
      Object.keys(changes.initGameSettingsForTherapist?.currentValue).length !== 0
    ) {
      this.initGameSettingsForTherapist = changes.initGameSettingsForTherapist.currentValue;
      this.handleIntroTypes(this.initGameSettingsForTherapist);
    }
  }

  handleIntroTypes(initGameSettings) {
    for (const [key, value] of Object.entries(initGameSettings)) {
      this.introTypes.push({ type: `${key}`, value: `${value}` });
    }
  }

  hideGameIntro() {
    this.onClickHomeButton.emit();
  }
}
