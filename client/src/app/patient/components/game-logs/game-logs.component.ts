import { select, NgRedux } from '@angular-redux/store';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PATIENT_LOG_STORAGE_KEY } from '../../../../constants';
import { MenuOptionsAppActions } from '../../components/menu-options/menu-options.actions';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
import { IGameAppData, IAppState } from '../../../../app/app.state';


@Component({
  selector: 'app-game-logs',
  templateUrl: './game-logs.component.html',
  styleUrls: ['./game-logs.component.scss'],
})
export class GameLogsComponent implements OnInit, OnDestroy {
  @select((state) => state.menu_options.gameLog)
  readonly gameLog$: Observable<any>;
  @Input() connectedUser;
  @Input() currentGameName;

  logsText: string = '';
  localStorageKey: string = '';
  lastId: number = 0;
  subscription: Subscription = new Subscription();
  lastGame: string = '';

  constructor(
    private menuOptionsAppActions: MenuOptionsAppActions,
    private ajaxService: AjaxService,
    private ngRedux: NgRedux<IAppState>,
  ) {}

  ngOnInit(): void {
    console.log('@dev=GameLogsComponent Initialized');
    this.localStorageKey =
      this.connectedUser.peerId + '_' + this.currentGameName + PATIENT_LOG_STORAGE_KEY;
    console.log('@dev=====localStorageKey===', this.localStorageKey);

    this.subscription.add(
      this.gameLog$.subscribe((gameLog) => {
        console.log('@dev=======gamelog====', gameLog);

        if (
          gameLog.peerId &&
          gameLog.peerId == this.connectedUser.peerId &&
          gameLog.id != this.lastId
        ) {
          this.lastId = gameLog.id;
          const name = gameLog.worksheetName ? gameLog.worksheetName + ':' : '';
          const note = gameLog.textLog;
          const drawer = gameLog.drawer ? gameLog.drawer + '/' : '';
          const newData = `${drawer} ${name} ${note}\n`;

          console.log('@dev=going to save in localstorage');
          this.saveToLocalStorage(newData);

          // ✅ Also save to DB whenever a new log entry arrives
          this.saveLogToDatabase(newData, gameLog);

        } else if (gameLog.id && gameLog.id == this.lastId) {
          console.log('trying to duplicate log');
        } else if (this.currentGameName !== 'whiteboard') {
          localStorage.setItem(this.localStorageKey, ' ');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.menuOptionsAppActions.addUserGameLog({});
    this.subscription.unsubscribe();
  }

  saveToLocalStorage(newData?: string) {
    const recievedData = newData ? newData : `${this.logsText}\n`;
    let existingData = localStorage.getItem(this.localStorageKey) || '';
    const lines = existingData.split('\n');
    if (lines.length >= 2) {
      const lastLine = lines[lines.length - 2];
      if (lastLine && recievedData.includes(lastLine.trim())) {
        lines.splice(lines.length - 2, 1);
        existingData = lines.join('\n');
      }
    }
    const dataToSave = existingData + recievedData;
    console.log('@dev=going to save in localstorage', dataToSave);
    localStorage.setItem(this.localStorageKey, dataToSave);
    this.logsText = '';
  }

  saveLogToDatabase(formattedLogLine: string, gameLog: any): void {
    try {
      const token = this.ngRedux.getState().global.gameSessionToken;
  
      // ✅ Read full log before clearing
      const fullLog = localStorage.getItem(this.localStorageKey) || '';
  
      const payload = {
        gameSummary: {
          fullLog,
          logLine: formattedLogLine,
          worksheetName: gameLog.worksheetName || '',
          drawer: gameLog.drawer || '',
          textLog: gameLog.textLog || '',
          gameName: this.currentGameName,
        },
        token,
        patientPeerId: gameLog.peerId,
      };
  
      this.ajaxService.updateGameSummarytherapist(payload).subscribe({
        next: (res) => {
          console.log('@dev=Game log saved to DB:', res);
          // ✅ Clear localStorage ONLY after successful DB save
          localStorage.removeItem(this.localStorageKey);
        },
        error: (err) => {
          console.error('@dev=Failed to save game log to DB:', err);
          // ✅ localStorage kept intact on failure so no data is lost
        },
      });
    } catch (err) {
      console.error('@dev=saveLogToDatabase error:', err);
    }
  }

  // ✅ Manual save button handler — saves textarea content to both localStorage and DB
  saveManual(): void {
    if (!this.logsText) return;
    const newData = `${this.logsText}\n`;
    this.saveToLocalStorage(newData);
    this.saveLogToDatabase(newData, {
      peerId: this.connectedUser.peerId,
      id: Date.now(),
      textLog: this.logsText,
      gameName: this.currentGameName,
    });
  }
}