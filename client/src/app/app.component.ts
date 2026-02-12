import {
  GeneralModalComponent,
  GeneralModalData,
  OuterModalInterface,
} from './common/general-modal/general-modal.component';
import { RTMModalComponent, RTMModalData, RTMOuterModalInterface } from './common/rtm-modal/rtm-modal.component';
import { SHOWRTMModalComponent, SHOWRTMModalData, SHOWRTMOuterModalInterface } from './common/show-rtm-modal/rtm-modal.component';
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from './common/services/authentication.service';
import { EventsService } from './patient/services/events.service';
import { select } from '@angular-redux/store';
import { Observable, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CallModalComponent } from './common/call-modal/call_modal.component';
import { AppActions } from '../app/app.actions';
import { AudioContext } from 'standardized-audio-context';
import { DisconnectedVideoSessionComponent } from './common/video-session-disconneted-modal/video_session_disconneted_modal.component';
import { roleMainRoute, ROUTES } from './routes';
import { AjaxService } from './therapist/services/ajax.service';
import { PatientGeneralModalComponent } from './common/patient-general-modal/patient_general_modal.component';
import { MOBILE_OR_SMALL_RESOLUTION } from './common/utils';
import { environment } from '../environments/environment';
import { FeatureFlagService } from './common/services/feature-flag.service';

window.addEventListener('securitypolicyviolation', console.error.bind(console));
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'reability';
  @select((state) => state.global.callModal) readonly callModal$: Observable<boolean>;
  @select((state) => state.global.disconnectionModal) readonly disconnectionModal$: Observable<boolean>;
  @select((state) => state.global.mutedMicModal) readonly mutedMicModal$: Observable<boolean>;
  @select((state) => state.global.generalModal) readonly generalModal$: Observable<boolean>;
  @select((state) => state.global.rtmModal) readonly rtmModal$: Observable<boolean>;
  @select((state) => state.global.showrtmModal) readonly showrtmModal$: Observable<boolean>;
  @select((state) => state.global.patientGeneralModal) readonly patientGeneralModal$: Observable<boolean>;

  dialogRef: any;
  globalDialogRef: any;
  rtmDialogRef: any;
  showrtmDialogRef: any;
  subscription: Subscription = new Subscription();
  audioContext;
  callAudio;
  audioTrack;
  gainNode;
  source;
  dummySource;
  isMobile = false;

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private eventsService: EventsService,
    private dialog: MatDialog,
    private appActions: AppActions,
    private ajax: AjaxService,
    private ngZone: NgZone,
    private flagService: FeatureFlagService,
  ) {
    this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    window.addEventListener('resize', () => {
      this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    });
  }

  async ngOnInit() {
    localStorage.openpages = Date.now();
    var onLocalStorageEvent = function (e) {
      if (e.key == 'openpages') {
        localStorage.page_available = Date.now();
      }
      if (e.key == 'page_available') {
        // No popups or redirects; log only
        console.warn('[Mode Fix] Duplicate tab detected (logging only, no redirect)');
      }
    };
    window.addEventListener('storage', onLocalStorageEvent, false);
    this.audioContext = new AudioContext();
    this.unlockAudioContext();
    document.addEventListener('hands_move', (e: any) => this.onMouseMoveCallback(e));

    this.subscription.add(
      this.callModal$.subscribe((modalData: any) => {
        this.ngZone.run(() => {
          if (modalData.open && !this.dialogRef) {
            if (this.isMobile) {
              modalData.data.position = { right: '50px', bottom: '50px' };
            }
            this.playCallAudio(modalData);
          }
          if (!modalData.open && this.dialogRef) {
            this.closeModal();
            this.stopCallAudio();
          }
        });
      })
    );

    this.subscription.add(
      this.disconnectionModal$.subscribe((modalData: any) => {
        if (modalData.open && !this.dialogRef) {
          this.openDisconnectionModal(modalData.data);
        }
        if (!modalData.open && this.dialogRef) {
          this.closeModal();
        }
      })
    );

    this.subscription.add(
      this.mutedMicModal$.subscribe((modalData: any) => {
        if (modalData.open && !this.dialogRef) {
          this.openMuteModal(modalData.data);
        }
        if (!modalData.open && this.dialogRef) {
          this.closeModal();
        }
      })
    );
    this.subscription.add(
      this.generalModal$.subscribe((modalData: any) => {
        if (modalData.open && !this.globalDialogRef) {
          this.openGlobalModal(modalData.data);
        }
        if (!modalData.open && this.globalDialogRef) {
          this.closeGlobalModal();
        }
      })
    );

    this.subscription.add(
      this.rtmModal$.subscribe((modalData: any) => {
        if (modalData.open && !this.rtmDialogRef) {
          this.openRTMModal(modalData.data);
        }
        if (!modalData.open && this.rtmDialogRef) {
          this.closeGlobalModal();
        }
      })
    );

    this.subscription.add(
      this.showrtmModal$.subscribe((modalData: any) => {
        if (modalData.open && !this.showrtmDialogRef) {
          this.showOpenRTMModal(modalData.data);
        }
        if (!modalData.open && this.showrtmDialogRef) {
          this.closeGlobalModal();
        }
      })
    );

    this.subscription.add(
      this.patientGeneralModal$.subscribe((modalData: any) => {
        this.ngZone.run(() => {
          if (modalData.open && !this.dialogRef) {
            this.openPatientGeneralModal(modalData.data);
          }
          if (!modalData.open && this.dialogRef) {
            this.closeModal();
          }
        });
      })
    );

    // notificationsEmitter.subscribe({});

    try {
      const isAuthenticateResult = await this.ajax.checkIsAuthenticate().toPromise();
      if (!isAuthenticateResult || !isAuthenticateResult.isAuthenticated) {
        if (!this.router.url.includes('email_auth')) {
          this.router.navigate(['login']);
        }
        return;
      } else {        
        const userDataResult = await this.ajax.getUserData().toPromise();
        if (!userDataResult) {
          return;
        } else {
          const tncFlag = this.flagService.isEnabled('TERM_CONDITION_POPUP_FLAG');
        console.log("======tncflag===2222==",tncFlag);
          this.authenticationService.updateUser(userDataResult);
          if (
            (!localStorage.getItem('verified2FA') || localStorage.getItem('verified2FA') == 'false') &&
            ['admin'].includes(userDataResult.role)
          ) {
            if (userDataResult.is_two_factor_enabled) {
              this.router.navigate([`/${ROUTES.VERIFY_2FA.split(':id')[0]}${userDataResult.peerId}`], {
                queryParams: { enable2FA: true },
              });
            } else {
              this.router.navigate([`/${ROUTES.VERIFY_2FA.split(':id')[0]}${userDataResult.peerId}`], {
                queryParams: { enable2FA: false },
              });
            }
            return;
          } else if (userDataResult?.role === 'patient' && tncFlag && userDataResult?.date_agreed_terms) {
            this.router.navigate([`${roleMainRoute('TERMS_CONDITIONS')}`]);
          } else if (userDataResult?.role === 'patient' && environment.rtmPopupFlag && userDataResult?.isPainModelOpen) {
            this.router.navigate([`${roleMainRoute('RTM')}`]);
          } else this.router.navigate([`${roleMainRoute(userDataResult.role)}`]);
        }
      }
    } catch (err) {
      this.router.navigate(['login']);
    }
  }

  unlockAudioContext = () => {
    if (this.audioContext.state !== 'suspended' && this.audioContext.state !== 'interrupted') return;
    const b = document.body;
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
    events.forEach((e) => b.addEventListener(e, this.unlock, false));
  };

  unlock = () => {
    if (!this.dummySource) {
      this.audioContext.resume().then(() => {
        this.dummySource = this.audioContext.createBufferSource();
        this.dummySource.buffer = this.audioContext.createBuffer(1, 1, 22050);
        this.dummySource.connect(this.audioContext.destination);
        this.dummySource.start();
      });
    }
  };

  clean = () => {
    const b = document.body;
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown'];
    events.forEach((e) => b.removeEventListener(e, this.unlock));
  };

  playCallAudio = (modalData) => {
    if (modalData.playSound) {
      const request = new XMLHttpRequest();
      request.open('GET', '../assets/audio/skype_call.mp3', true);
      request.responseType = 'arraybuffer';
      request.onload = () => {
        this.audioContext.decodeAudioData(request.response, (buffer) => {
          this.source = this.audioContext.createBufferSource();
          this.source.buffer = buffer;
          this.source.connect(this.audioContext.destination);
          this.source.start();
          this.openModal(modalData.data);
        });
      };
      request.send();
    } else {
      this.openModal(modalData.data);
    }
  };

  stopCallAudio = () => {
    if (this.source) {
      this.source.stop();
    }
  };

  openModal(modalData) {
    const {
      panelClass,
      header,
      content,
      approveCallback,
      declineCallback,
      acceptBtnImg = '',
      acceptBtnImgHover = '',
      timeout,
      position,
    } = modalData;
    this.dialogRef = this.dialog.open(CallModalComponent, {
      hasBackdrop: true,
      panelClass,
      data: {
        header,
        content,
        acceptBtnImg,
        acceptBtnImgHover,
        timeout,
      },
      position,
    });

    // tslint:disable-next-line: no-string-literal
    this.subscription.add(
      this.dialogRef.componentInstance['isApprove'].subscribe((isApprove) => {
        if (isApprove) {
          approveCallback();
        } else {
          declineCallback();
        }
        this.ngZone.run(() => {
          this.stopCallAudio();
          this.appActions.closeModal();
          this.closeModal();
        });
      })
    );
  }

  closeModal() {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null;
    }
  }

  openDisconnectionModal = (modalData) => {
    const { header, content, approveCallback } = modalData;
    this.dialogRef = this.dialog.open(DisconnectedVideoSessionComponent, {
      data: {
        header,
        content,
      },
    });

    // tslint:disable-next-line: no-string-literal
    this.subscription.add(
      this.dialogRef.componentInstance['leaveSession'].subscribe((leaveSession) => {
        if (leaveSession) {
          approveCallback();
        }
        this.appActions.closeDisconnectionModal();
      })
    );
  };

  openMuteModal = (modalData) => {
    const { header, content, approveCallback } = modalData;
    this.dialogRef = this.dialog.open(DisconnectedVideoSessionComponent, {
      data: {
        header,
        content,
      },
    });

    // tslint:disable-next-line: no-string-literal
    this.subscription.add(
      this.dialogRef.componentInstance['leaveSession'].subscribe((leaveSession) => {
        if (leaveSession) {
          approveCallback();
        }
        this.appActions.closeMutedMicModal();
      })
    );
  };

  onMouseMoveCallback({ detail: { r_x, r_y, l_x, l_y } }) {
    this.eventsService.mouseMove({ r_x, r_y, l_x, l_y });
  }

  openGlobalModal(modalData: GeneralModalData) {
    const wrapperEl = document.getElementById('main-app');
    const {
      header,
      content,
      approveCallback,
      declineCallback,
      isTherapist,
      modalStyle,
      patient,
      acceptBtnImg = '',
      acceptBtnImgHover = '',
      declineBtnImg = '',
      declineBtnImgHover = '',
    } = modalData;
    this.globalDialogRef = this.dialog.open(GeneralModalComponent, {
      data: {
        header,
        content,
        acceptBtnImg,
        acceptBtnImgHover,
        declineBtnImg,
        declineBtnImgHover,
        approveCallback,
        declineCallback,
        positionRelativeToElement: wrapperEl,
        isTherapist,
        modalStyle,
        patient,
      },
    });

    this.subscription.add(
      this.globalDialogRef.componentInstance['isApprove'].subscribe((modalData: OuterModalInterface) => {
        if (modalData.isApproveClicked) {
          approveCallback(modalData);
        } else {
          declineCallback();
          this.closeGlobalModal();
        }
      })
    );
  }

  closeGlobalModal() {
    this.appActions.setMessageGeneralModal('');
    if (this.globalDialogRef) {
      this.globalDialogRef.close();
      this.globalDialogRef = null;
    }
  }

  openRTMModal(modalData: RTMModalData) {
    const wrapperEl = document.getElementById('main-app');
    const {
      header,
      content,
      approveCallback,
      declineCallback,
      isTherapist,
      modalStyle,
      patient,
      acceptBtnImg = '',
      acceptBtnImgHover = '',
      declineBtnImg = '',
      declineBtnImgHover = '',
    } = modalData;
    this.rtmDialogRef = this.dialog.open(RTMModalComponent, {
      data: {
        header,
        content,
        acceptBtnImg,
        acceptBtnImgHover,
        declineBtnImg,
        declineBtnImgHover,
        approveCallback,
        declineCallback,
        positionRelativeToElement: wrapperEl,
        isTherapist,
        modalStyle,
        patient,
      },
    });

    this.subscription.add(
      this.rtmDialogRef.componentInstance['isApprove'].subscribe((modalData: RTMOuterModalInterface) => {
        if (modalData.isApproveClicked) {
          approveCallback(modalData);
        } else {
          declineCallback();
          this.closeRTMModal();
        }
      })
    );
  }

  closeRTMModal() {
    this.appActions.setMessageRTMModal('');
    if (this.rtmDialogRef) {
      this.rtmDialogRef.close();
      this.rtmDialogRef = null;
    }
  }
  showOpenRTMModal(modalData: SHOWRTMModalData) {
    const wrapperEl = document.getElementById('main-app');
    const {
      header,
      content,
      approveCallback,
      declineCallback,
      isTherapist,
      modalStyle,
      patient,
      acceptBtnImg = '',
      acceptBtnImgHover = '',
      declineBtnImg = '',
      declineBtnImgHover = '',
    } = modalData;
    this.showrtmDialogRef = this.dialog.open(SHOWRTMModalComponent, {
      data: {
        header,
        content,
        acceptBtnImg,
        acceptBtnImgHover,
        declineBtnImg,
        declineBtnImgHover,
        approveCallback,
        declineCallback,
        positionRelativeToElement: wrapperEl,
        isTherapist,
        modalStyle,
        patient,
      },
    });

    this.subscription.add(
      this.showrtmDialogRef.componentInstance['isApprove'].subscribe((modalData: SHOWRTMOuterModalInterface) => {
        if (modalData.isApproveClicked) {
          approveCallback(modalData);
        } else {
          declineCallback();
          this.showcloseRTMModal();
        }
      })
    );
  }

  showcloseRTMModal() {
    this.appActions.setMessageShowRTMModal('');
    if (this.showrtmDialogRef) {
      this.showrtmDialogRef.close();
      this.showrtmDialogRef = null;
    }
  }

  openPatientGeneralModal(modalData) {
    const {
      panelClass,
      header,
      content,
      approveCallback,
      declineCallback,
      acceptBtnImg = '',
      acceptBtnImgHover = '',
      timeout,
      acceptBtnText,
    } = modalData;
    this.dialogRef = this.dialog.open(PatientGeneralModalComponent, {
      hasBackdrop: true,
      panelClass,
      data: {
        header,
        content,
        acceptBtnImg,
        acceptBtnImgHover,
        timeout,
        acceptBtnText,
      },
    });

    // tslint:disable-next-line: no-string-literal
    this.subscription.add(
      this.dialogRef.componentInstance['isApprove'].subscribe((isApprove) => {
        if (isApprove) {
          approveCallback();
        } else {
          declineCallback();
        }
        this.ngZone.run(() => {
          this.appActions.closeModal();
          this.closeModal();
        });
      })
    );
  }

  ngOnDestroy() {
    document.removeEventListener('hands_move', (e: any) => this.onMouseMoveCallback(e));
    this.subscription.unsubscribe();
    // notificationsEmitter.unsubscribe();
  }
}
