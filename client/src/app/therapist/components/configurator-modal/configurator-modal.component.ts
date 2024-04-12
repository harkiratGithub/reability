import { Component, OnInit, Inject } from '@angular/core';
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
export class ConfiguratorModalComponent implements OnInit {
  game;
  patient;
  GAMES_WITH_THERAPIST_COLORSET = ['studio', 'wipe', 'squat', 'elephant', 'rush', 'whiteboard'];
  isGameConfiguratorInTherapistColorset = false;

  constructor(
    public dialogRef: MatDialogRef<ConfiguratorModalComponent>,
    private ajax: AjaxService,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData
  ) {
    this.game = this.dialogData.game;
    this.patient = this.dialogData.patient;
    this.isGameConfiguratorInTherapistColorset = this.GAMES_WITH_THERAPIST_COLORSET.includes(this.game.name);
  }

  onIframeLoad = () => {
    const iframeEl = document.getElementById('game-iframe');
    this.ajax.getGameSettingsForPatient(this.game.id, this.patient.id).subscribe((settings) => {
      communicationUtil.sendMessageToIframe(
        iframeEl,
        { isTherapist: true, peerId: this.patient.peerId, patientSettings: settings, isExternalConfigurator: true },
        MESSAGES.IS_THERAPIST
      );
    });
    if (this.game.name == 'whiteboard') {
      this.handleWhiteboardExternalConfigurator();
    }
  };

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
