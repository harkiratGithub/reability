import { Component, OnInit, OnChanges, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { select } from '@angular-redux/store';
import { Subscription, Observable } from 'rxjs';

import { AppActions } from '../../../../app/app.actions';
import { communicationUtil, MESSAGES } from '../../../common/services/communication_util.service';
import { IScore } from '../../../../types';

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
  private stuckAt95Timeout: any = null;

  @select((state) => state.global.currentGameName) readonly currentGameName$: Observable<string>;
  @select((state) => state.global.initGameSettings) readonly initGameSettings$: Observable<object>;
  @select((state) => state.global.score) readonly score$: Observable<IScore>;

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

  private isGrillGame(): boolean {
    return !!(
      this.currentGameName?.toLowerCase() === 'grill' ||
      (this.initGameSettingsForTherapist &&
        (this.initGameSettingsForTherapist.gameId === 20 ||
          this.initGameSettingsForTherapist.gameName?.toLowerCase() === 'grill'))
    );
  }

  ngOnInit() {
    // Clear any existing timeout
    if (this.stuckAt95Timeout) {
      clearTimeout(this.stuckAt95Timeout);
      this.stuckAt95Timeout = null;
    }
    
    if (!this.isTherapistMode) {
      this.subscription.add(
        this.initGameSettings$.subscribe((initGameSettings) => {
          this.handleIntroTypes(initGameSettings);
        })
      );

      // Patient side: reflect real-time game progress (0 → 100) in the loader
      this.subscription.add(
        this.score$.subscribe((score) => {
          // Only drive from score for Grill on patient side
          if (!this.isGrillGame()) {
            return;
          }

          const rawValue = (score?.value as unknown) as number | string;
          const numericValue = Math.max(
            0,
            Math.min(100, Math.round(typeof rawValue === 'string' ? parseFloat(rawValue) : Number(rawValue)))
          );

          // Keep percentage monotonically increasing to avoid jitter
          if (numericValue > this.loadingBarPercentage) {
            this.loadingBarPercentage = numericValue;
          }

          // Ensure the bar is visible once progress starts
          if (!this.gotGameSettings && this.loadingBarPercentage > 0) {
            this.gotGameSettings = true;
          }
        })
      );
    }

    const loadingBarInterval = setInterval(() => {
      const isGrillGame = this.isGrillGame();

      // For Grill game on therapist side, progress based on video stream readiness
      if (isGrillGame && this.isTherapistMode) {
        // Start showing progress immediately
        if (!this.gotGameSettings) {
          this.gotGameSettings = true;
        }
        
        // Check if video stream is ready
        const grillVideoEl = document.getElementById('grill-video-' + this.connectionId) as HTMLVideoElement | null;
        if (grillVideoEl) {
          // Check if video has dimensions (is playing)
          const hasDimensions = grillVideoEl.videoWidth > 0 && grillVideoEl.videoHeight > 0;
          // Check if video has srcObject (stream is attached)
          const hasStream = (grillVideoEl as any).srcObject !== null && (grillVideoEl as any).srcObject !== undefined;
          // Check if video is ready to play
          const isReady = grillVideoEl.readyState >= 2; // HAVE_CURRENT_DATA or higher
          
          if (hasDimensions) {
            // Video is ready, complete the loading
            if (this.loadingBarPercentage < 100) {
              this.loadingBarPercentage = 100;
            }
          } else if (hasStream && isReady) {
            // Stream is attached and video is ready but dimensions not yet available
            // Progress to 98% and wait for dimensions
            if (this.loadingBarPercentage < 98) {
              this.loadingBarPercentage = Math.min(98, this.loadingBarPercentage + 2);
            }
            // Add event listener to detect when dimensions become available
            if (!(grillVideoEl as any).__dimensionListenerAdded) {
              (grillVideoEl as any).__dimensionListenerAdded = true;
              const onVideoReady = () => {
                if (grillVideoEl && grillVideoEl.videoWidth > 0 && grillVideoEl.videoHeight > 0) {
                  this.loadingBarPercentage = 100;
                }
              };
              grillVideoEl.addEventListener('loadedmetadata', onVideoReady, { once: true });
              grillVideoEl.addEventListener('loadeddata', onVideoReady, { once: true });
              grillVideoEl.addEventListener('canplay', onVideoReady, { once: true });
              grillVideoEl.addEventListener('playing', onVideoReady, { once: true });
            }
          } else if (hasStream) {
            // Stream is attached but not ready yet
            if (this.loadingBarPercentage < 95) {
              this.loadingBarPercentage = Math.min(95, this.loadingBarPercentage + 5);
            }
            // If stuck at 95% with stream attached, set a timeout to force complete
            if (this.loadingBarPercentage >= 95 && !this.stuckAt95Timeout) {
              this.stuckAt95Timeout = setTimeout(() => {
                // Check one more time if dimensions are available
                if (grillVideoEl && grillVideoEl.videoWidth > 0 && grillVideoEl.videoHeight > 0) {
                  this.loadingBarPercentage = 100;
                } else if (hasStream) {
                  // Stream exists, force complete even if dimensions not detected
                  this.loadingBarPercentage = 100;
                }
                this.stuckAt95Timeout = null;
              }, 3000); // Wait 3 seconds at 95% before forcing completion
            }
          } else if (this.loadingBarPercentage < 95) {
            // No stream yet, gradually increase progress
            this.loadingBarPercentage = Math.min(95, this.loadingBarPercentage + 5);
          }
        } else if (this.loadingBarPercentage < 95) {
          // Video element doesn't exist yet, gradually increase progress
          this.loadingBarPercentage = Math.min(95, this.loadingBarPercentage + 5);
        }

        // Final safety net: if we've reached 95% (with or without stream) and stay there,
        // force completion after a short delay so the therapist UI never hangs.
        if (this.loadingBarPercentage >= 95 && !this.stuckAt95Timeout) {
          this.stuckAt95Timeout = setTimeout(() => {
            this.loadingBarPercentage = 100;
            this.stuckAt95Timeout = null;
          }, 4000);
        }
      } else if (isGrillGame && !this.isTherapistMode) {
        // Grill game on patient side - progress based on Unity loading
        // This will be handled by the game_wrapper component sending progress updates
        // For now, just show minimal progress
        if (!this.gotGameSettings) {
          // Start from 0% until score updates arrive
          this.loadingBarPercentage = 0;
          this.gotGameSettings = true;
        }
      } else if (this.introTypes.length > 0) {
        // Non-Grill games should follow ga-candidate behavior.
        if (!this.gotGameSettings) {
          this.gotGameSettings = true;
        }
        this.loadingBarPercentage += 20;
      }
      
      if (this.loadingBarPercentage >= 100) {
        if (!isGrillGame) {
          this.loadingBarPercentage = 100;
          this.iframeEl = document.getElementById('games-iframe-' + this.connectionId);
          if (this.iframeEl) {
            communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_INTRODUCTION_DONE);
          }
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
          return;
        }

        this.loadingBarPercentage = 100; // Ensure it's exactly 100
        // Clear stuck timeout if we reached 100%
        if (this.stuckAt95Timeout) {
          clearTimeout(this.stuckAt95Timeout);
          this.stuckAt95Timeout = null;
        }
        this.iframeEl = document.getElementById('games-iframe-' + this.connectionId);
        if (this.iframeEl) {
          communicationUtil.sendMessageToIframe(this.iframeEl, {}, MESSAGES.GAME_INTRODUCTION_DONE);
        }
        clearInterval(loadingBarInterval);
        // Always emit introductionProgressEnded for therapist mode to hide loading screen
        if (this.isTherapistMode) {
          this.introductionProgressEnded.emit(true);
          // For Grill game or any game, always emit sendShowTimerForTherapist to hide loading screen
          // The loading screen visibility is controlled by !showTimerForTherapist
          this.sendShowTimerForTherapist.emit(true);
        } else {
          // Patient side behavior
          if (this.isGameReadyToStart) {
            this.appActions.showTimer(true);
          } else {
            this.introductionProgressEnded.emit(true);
          }
        }
      }
    }, 500); // Check more frequently for smoother updates
    setTimeout(() => {
      this.isShowMsg = true;
    }, 5000);
    setTimeout(() => {
      this.message = this.secondMsg;
    }, 10000);
  }


  ngOnDestroy() {
    if (this.stuckAt95Timeout) {
      clearTimeout(this.stuckAt95Timeout);
      this.stuckAt95Timeout = null;
    }
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes.initGameSettingsForTherapist?.currentValue &&
      Object.keys(changes.initGameSettingsForTherapist?.currentValue).length !== 0
    ) {
      this.initGameSettingsForTherapist = changes.initGameSettingsForTherapist.currentValue;
      this.handleIntroTypes(this.initGameSettingsForTherapist);
      console.log('this.initGameSettingsForTherapist 222222>>>>>>>>>>>>>>>>>>>', this.initGameSettingsForTherapist);
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
