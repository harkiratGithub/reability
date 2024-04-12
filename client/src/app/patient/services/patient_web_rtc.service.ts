import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class PatientWebRtcService {
  private currentGameStateSubject: BehaviorSubject<any>;
  public currentGameState: Observable<any>;

  private currentGameStateFromTherapistSubject: BehaviorSubject<any>;
  public currentGameStateFromTherapist: Observable<any>;

  private skeletonBufferStateSubject: BehaviorSubject<any>;
  public skeletonBufferState: Observable<any>;

  private skeletonBufferFromWebCamStateSubject: BehaviorSubject<any>;
  public skeletonBufferFromWebCamState: Observable<any>;

  private shouldPauseGameSubject: BehaviorSubject<any>;
  public shouldPauseGameState: Observable<any>;

  private shouldCloseFullScreenVideoSessionSubject: BehaviorSubject<any>;
  public shouldCloseFullScreenVideoSession: Observable<any>;

  private genericMessageFromPatientToTherapistSubject: BehaviorSubject<any>;
  public genericMessageFromPatientToTherapist: Observable<any>;

  private newSettingsSubject: BehaviorSubject<any>;
  public newSettings: Observable<any>;
  private genericMessageFromTherapistToPatientSubject: BehaviorSubject<any>;
  public genericMessageFromTherapistToPatient: Observable<any>;

  private sendPatientToLobbySubject: BehaviorSubject<any>;
  public sendPatientToLobby: Observable<any>;

  private restartGameForPatientSubject: BehaviorSubject<any>;
  public restartGameForPatient: Observable<any>;

  private isInSplitScreenSubject: BehaviorSubject<any>;
  public isInSplitScreen: Observable<any>;

  private isSwappedScreenSubject: BehaviorSubject<any>;
  public isSwappedScreen: Observable<any>;

  private shouldShowEndGameModalSubject: BehaviorSubject<any>;
  public shouldShowEndGameModal: Observable<any>;

  private recoverdFromNetworkErrorSubject: BehaviorSubject<any>;
  public recoverdFromNetworkError: Observable<any>;

  private muteGameSoundFromTherapistSubject: BehaviorSubject<any>;
  public muteGameSoundFromTherapist: Observable<any>;

  private mirrorFullScreenVideoFromTherapistSubject: BehaviorSubject<any>;
  public mirrorFullScreenVideoFromTherapist: Observable<any>;

  constructor() {
    this.currentGameStateSubject = new BehaviorSubject<any>([]);
    this.currentGameState = this.currentGameStateSubject.asObservable();

    this.currentGameStateFromTherapistSubject = new BehaviorSubject<any>([]);
    this.currentGameStateFromTherapist = this.currentGameStateFromTherapistSubject.asObservable();

    this.skeletonBufferStateSubject = new BehaviorSubject<any>([]);
    this.skeletonBufferState = this.skeletonBufferStateSubject.asObservable();

    this.skeletonBufferFromWebCamStateSubject = new BehaviorSubject<any>([]);
    this.skeletonBufferFromWebCamState = this.skeletonBufferFromWebCamStateSubject.asObservable();

    this.shouldPauseGameSubject = new BehaviorSubject<any>(null);
    this.shouldPauseGameState = this.shouldPauseGameSubject.asObservable();

    this.genericMessageFromPatientToTherapistSubject = new BehaviorSubject<any>([]);
    this.genericMessageFromPatientToTherapist = this.genericMessageFromPatientToTherapistSubject.asObservable();

    this.newSettingsSubject = new BehaviorSubject<any>([]);
    this.newSettings = this.newSettingsSubject.asObservable();
    this.genericMessageFromTherapistToPatientSubject = new BehaviorSubject<any>(null);
    this.genericMessageFromTherapistToPatient = this.genericMessageFromTherapistToPatientSubject.asObservable();

    this.sendPatientToLobbySubject = new BehaviorSubject<any>([]);
    this.sendPatientToLobby = this.sendPatientToLobbySubject.asObservable();

    this.shouldCloseFullScreenVideoSessionSubject = new BehaviorSubject<any>([]);
    this.shouldCloseFullScreenVideoSession = this.shouldCloseFullScreenVideoSessionSubject.asObservable();

    this.restartGameForPatientSubject = new BehaviorSubject<any>([]);
    this.restartGameForPatient = this.restartGameForPatientSubject.asObservable();

    this.isInSplitScreenSubject = new BehaviorSubject<any>(null);
    this.isInSplitScreen = this.isInSplitScreenSubject.asObservable();

    this.isSwappedScreenSubject = new BehaviorSubject<any>(null);
    this.isSwappedScreen = this.isSwappedScreenSubject.asObservable();

    this.shouldShowEndGameModalSubject = new BehaviorSubject<any>(null);
    this.shouldShowEndGameModal = this.shouldShowEndGameModalSubject.asObservable();

    this.recoverdFromNetworkErrorSubject = new BehaviorSubject<any>(null);
    this.recoverdFromNetworkError = this.recoverdFromNetworkErrorSubject.asObservable();

    this.muteGameSoundFromTherapistSubject = new BehaviorSubject<any>(null);
    this.muteGameSoundFromTherapist = this.muteGameSoundFromTherapistSubject.asObservable();

    this.mirrorFullScreenVideoFromTherapistSubject = new BehaviorSubject<any>(null);
    this.mirrorFullScreenVideoFromTherapist = this.mirrorFullScreenVideoFromTherapistSubject.asObservable();
  }

  public get isInSplitScreenValue(): any {
    return this.isInSplitScreenSubject.value;
  }

  public get isSwappedScreenValue(): any {
    return this.isSwappedScreenSubject.value;
  }

  public get shouldShowEndGameModalValue(): any {
    return this.shouldShowEndGameModalSubject.value;
  }

  public get recoverdFromNetworkErrorValue(): any {
    return this.recoverdFromNetworkErrorSubject.value;
  }

  setIsSplitScreen(status) {
    this.isInSplitScreenSubject.next(status);
  }

  setIsSwappedScreen(data) {
    this.isSwappedScreenSubject.next(data);
  }

  setShouldShowEndGameModal(status) {
    this.shouldShowEndGameModalSubject.next(status);
  }

  public get currentGameStateValue(): any {
    return this.currentGameStateSubject.value;
  }

  setCurrentState(gameState) {
    this.currentGameStateSubject.next(gameState);
  }

  public get skeletonBufferValue(): any {
    return this.skeletonBufferStateSubject.value;
  }

  setSkeletonBuffer(skeletonBuffer) {
    this.skeletonBufferStateSubject.next(skeletonBuffer);
  }

  public get skeletonBufferFromWebCamValue(): any {
    return this.skeletonBufferFromWebCamStateSubject.value;
  }

  setSkeletonBufferFromWebCamBuffer(skeletonBuffer) {
    this.skeletonBufferFromWebCamStateSubject.next(skeletonBuffer);
  }

  public get shouldPauseGameStateValue(): any {
    return this.shouldPauseGameSubject.value;
  }

  setShouldPauseGameState(gameState) {
    this.shouldPauseGameSubject.next(gameState);
  }

  setShouldCloseFullScreenVideoSession(videoSessionState) {
    this.shouldCloseFullScreenVideoSessionSubject.next(videoSessionState);
  }

  setCurrentGenericMessageFromPatientToTherapist(message) {
    this.genericMessageFromPatientToTherapistSubject.next(message);
  }

  setCurrentNewSettings(settings) {
    this.newSettingsSubject.next(settings);
  }

  public get currentGameStateFromTherapistValue(): any {
    return this.currentGameStateFromTherapistSubject.value;
  }

  setCurrentGameStateFromTherapist(gameState) {
    this.currentGameStateFromTherapistSubject.next(gameState);
  }

  setCurrentGenericMessageFromTherapistToPatient(message) {
    this.genericMessageFromTherapistToPatientSubject.next(message);
  }
  setQuitGameFromTherapistToPatient(message) {
    this.sendPatientToLobbySubject.next(message);
  }
  setRestartGameFromTherapistToPatient(message) {
    this.restartGameForPatientSubject.next(message);
  }
  setRecoverdFromNetworkError(message) {
    this.recoverdFromNetworkErrorSubject.next(message);
  }
  setMuteGameSoundFromTherapistToPatient(message) {
    this.muteGameSoundFromTherapistSubject.next(message);
  }
  setMirrorFullScreenVideoTherapistToPatient(message) {
    this.mirrorFullScreenVideoFromTherapistSubject.next(message);
  }
}
