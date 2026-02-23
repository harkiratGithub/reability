import { Component, OnInit, Inject ,Input, AfterViewInit} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { communicationUtil, MESSAGES } from 'src/app/common/services/communication_util.service';
import { AjaxService } from '../../services/ajax.service';

export interface DialogData {
  game: any;
  patient: any;
  isGameConfiguratorInTherapistColorset: boolean;
}

@Component({
  selector: 'app-configurator-modal',
  templateUrl: './configurator-modal.component.html',
  styleUrls: ['./configurator-modal.component.scss'],
})
export class ConfiguratorModalComponent implements OnInit, AfterViewInit {
  @Input() game: any;
  @Input() patient: any;
  GAMES_WITH_THERAPIST_COLORSET = ['studio', 'wipe', 'squat', 'elephant', 'rush', 'whiteboard'];
  isGameConfiguratorInTherapistColorset = false;
  private iframeInitializedOnce = false;
  private unityInstance: any = null;
  private pendingGameSettings: any = null;
  // Always load iframe configurator for now

  /*constructor(
    public dialogRef: MatDialogRef<ConfiguratorModalComponent>,
    private ajax: AjaxService,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData
  ) {
    this.game = this.dialogData.game;
    this.patient = this.dialogData.patient;
    this.isGameConfiguratorInTherapistColorset = this.GAMES_WITH_THERAPIST_COLORSET.includes(this.game.name);
  }*/
    constructor(
      public dialogRef: MatDialogRef<ConfiguratorModalComponent>,
      private ajax: AjaxService,
      @Inject(MAT_DIALOG_DATA) public dialogData: DialogData
    ) {
      this.game = this.dialogData.game;
      this.patient = this.dialogData.patient;
      this.isGameConfiguratorInTherapistColorset = this.GAMES_WITH_THERAPIST_COLORSET.includes(this.game.name);
    }
  getConfiguratorUrl(): string {
    try {
      const url: string = this.game?.url || '';

      // Grill (Unity) is handled via direct load (no iframe)

      // Prefer a dedicated configurator URL when provided by backend/content team
      const explicitConfiguratorUrl: string =
        this.game?.configuratorUrl ||
        this.game?.configUrl ||
        this.game?.settingsUrl ||
        ''; // any of these keys will be honored
      if (explicitConfiguratorUrl) {
        return explicitConfiguratorUrl;
      }

      if (!url) return '';
      // If url already points to a specific html, append configurator query flag
      if (url.endsWith('.html')) {
        return url.includes('?') ? `${url}&configurator=1` : `${url}?configurator=1`;
      }
      // Otherwise, assume directory and use index.html with configurator flag
      const trimmed = url.endsWith('/') ? url.slice(0, -1) : url;
      return `${trimmed}/index.html?configurator=1`;
    } catch {
      return this.game?.url || '';
    }
  }

  onIframeLoad = () => {
    if (this.iframeInitializedOnce) {
      return;
    }
    this.iframeInitializedOnce = true;
    if (this.isGrillGame()) {
      return;
    }
    const iframeEl = document.getElementById('game-iframe');
    this.ajax.getGameSettingsForPatient(this.game.id, this.patient.id).subscribe((settings) => {
      // Normalize patient settings (supports {current_set} or flat JSON), but log only raw for clarity
      const normalizedSettings: any = (settings && settings.current_set) ? settings.current_set : (settings || {});


      // Merge mode='settings' + existing settings; provide defaults for optional fields
      const gameSettings = {
        ...normalizedSettings,
        // Force configurator to settings mode regardless of DB content
        mode: 'settings',
        // Optional fields per spec; Unity may choose to use them if supported
        skewerSide: normalizedSettings?.skewerSide ?? 'left',
        marketSoundVolume: normalizedSettings?.marketSoundVolume ?? 0.5,
      };

      const therapistMessage = {
        isTherapist: true,
        peerId: this.patient.peerId,
        // pass-through original for reference, but game will read from game_settings
        patientSettings: normalizedSettings,
        // effective settings for Unity
        game_settings: gameSettings,
        isExternalConfigurator: true,
      };

      communicationUtil.sendMessageToIframe(iframeEl, therapistMessage, MESSAGES.IS_THERAPIST);
      const { mode: _ignoredMode1, ...logNoMode1 } = gameSettings || {};
      console.log(logNoMode1);
    });
    if (this.game.name == 'whiteboard') {
      this.handleWhiteboardExternalConfigurator();
    }
  };

  ngAfterViewInit() {
    if (this.isGrillGame()) {
      this.loadUnityDirect();
      // Fetch settings and send once Unity is ready
      this.ajax.getGameSettingsForPatient(this.game.id, this.patient.id).subscribe((settings) => {
        const normalizedSettings: any = (settings && settings.current_set) ? settings.current_set : (settings || {});
        const gameSettings = {
          ...normalizedSettings,
          mode: 'settings',
          skewerSide: normalizedSettings?.skewerSide ?? 'left',
          marketSoundVolume: normalizedSettings?.marketSoundVolume ?? 0.5,
        };
        this.pendingGameSettings = gameSettings;
        this.trySendSettingsToUnity();
        const { mode: _ignoredMode2, ...logNoMode2 } = gameSettings || {};
        console.log(logNoMode2);
      });
    }
  }

  isGrillGame(): boolean {
    const name = (this.game?.name || '').toLowerCase();
    return this.game?.id === 20 || name === 'grill';
  }

  private loadUnityDirect() {
    const canvas = document.getElementById('unity-canvas') as HTMLCanvasElement;
    const BUILD_BASE = 'https://grillgamedemo.z13.web.core.windows.net/Build/';
    const script = document.createElement('script');
    script.src = BUILD_BASE + 'Grill_OB.loader.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      createUnityInstance(canvas, {
        dataUrl: BUILD_BASE + 'Grill_OB.data',
        frameworkUrl: BUILD_BASE + 'Grill_OB.framework.js',
        codeUrl: BUILD_BASE + 'Grill_OB.wasm',
        streamingAssetsUrl: 'StreamingAssets',
        companyName: 'Reability',
        productName: 'Physiotherapy Game',
        productVersion: '1.0',
        matchWebGLToCanvasSize: true,
        devicePixelRatio: (window.devicePixelRatio || 1)
      }).then((inst: any) => {
        this.unityInstance = inst;

        // Persist settings coming back from Unity (settings page changes)
        if (window.OpeningSceneManager) {
          window.OpeningSceneManager.onConfigSent = (configJson: string) => {
            try {
              const parsed = JSON.parse(configJson);
              // Do not persist Unity's transient 'mode' flag to DB
              const { mode, ...settingsWithoutMode } = parsed || {};
              console.log('[CONFIGURATOR] Saving updated settings from Unity configurator:', settingsWithoutMode);
              this.ajax.saveGameSettingsFromTherapist(this.patient.id, this.game.id, settingsWithoutMode);
            } catch (err) {
              console.warn('[CONFIGURATOR] Failed to parse/save config from Unity:', err);
            }
          };
        }

        this.trySendSettingsToUnity();
      }).catch((err: any) => {
        // Suppress noisy errors in UI; keep console minimal
        // console.error('Unity init failed', err);
      });
    };
    script.onerror = () => {
      // console.error('Failed to load Unity loader');
    };
    document.body.appendChild(script);
  }

  private trySendSettingsToUnity() {
    if (!this.unityInstance || !this.pendingGameSettings) return;
    const value = JSON.stringify(this.pendingGameSettings);
    try {
      this.unityInstance.SendMessage('SimplifiedOpeningSceneManager', 'OnModeAndConfigReceived', value);
    } catch {
      // ignore transient errors; Unity may not be fully ready
    }
  }

  handleWhiteboardExternalConfigurator() {
    const iframeEl = document.getElementById('game-iframe');
    communicationUtil.registerToCallback(MESSAGES.GET_SHORT_GAME_DATA, () => {
      this.ajax.getShortGameData(this.game.id).subscribe((data) => {
        communicationUtil.sendMessageToIframe(iframeEl, data, MESSAGES.SHORT_GAME_DATA);
      });
    });
    communicationUtil.registerToCallback(MESSAGES.GET_USER_GAME_DATA, () => {
      this.ajax.getUserGameData(this.game.id, this.patient.userId, true).subscribe((data) => {
        communicationUtil.sendMessageToIframe(iframeEl, data, MESSAGES.USER_GAME_DATA);
      });
    });
    communicationUtil.registerToCallback(MESSAGES.GET_GAME_DATA, (msg) => {
      this.ajax.getGameDataByIds(msg.gameDataIds).subscribe((data) => {
        communicationUtil.sendMessageToIframe(iframeEl, data, MESSAGES.GAME_DATA);
      });
    });
    communicationUtil.registerToCallback(MESSAGES.ADD_USER_GAME_DATA, (msg) => {
      const userGameData = msg.map((item) => {
        return { ...item, gameId: this.game.id, userId: this.patient.userId };
      });
      this.ajax.createUserGameData(userGameData).subscribe((data) => {
        communicationUtil.sendMessageToIframe(iframeEl, data, MESSAGES.USER_GAME_DATA_CREATED);
      });
    });
    communicationUtil.registerToCallback(MESSAGES.DELETE_USER_GAME_DATA, (msg) => {
      this.ajax.deleteUserGameData(msg, true).subscribe((data) => {
        communicationUtil.sendMessageToIframe(iframeEl, data, MESSAGES.USER_GAME_DATA_CREATED);
      });
    });
    communicationUtil.registerToCallback(MESSAGES.UPDATE_USER_GAME_DATA, (msg) => {
      this.ajax.updateUserGameData(msg, true).subscribe((data) => {
        communicationUtil.sendMessageToIframe(iframeEl, data, MESSAGES.USER_GAME_DATA_CREATED);
      });
    });
  }

  ngOnInit() {
    const self = this;

    communicationUtil.registerToCallback(MESSAGES.NEW_EXTERNAL_SETTINGS, (msg) => {
      this.ajax.saveGameSettingsFromTherapist(this.patient.id, this.game.id, msg);
      this.dialogRef.close();
    });

    communicationUtil.registerToCallback(MESSAGES.CLOSE_EXTERNAL_CONFIGURATOR, (msg) => {
      if (this.dialogRef) {
        this.dialogRef.close();
      }
    });
  }
}
