import { select } from '@angular-redux/store';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PATIENT_LOG_STORAGE_KEY } from '../../../../constants';
import { MenuOptionsAppActions } from '../../components/menu-options/menu-options.actions';

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

  constructor(private menuOptionsAppActions: MenuOptionsAppActions) {}

  ngOnInit(): void {
    this.localStorageKey = this.connectedUser.peerId + '_' + this.currentGameName + PATIENT_LOG_STORAGE_KEY;
    this.subscription.add(
      this.gameLog$.subscribe((gameLog) => {
        if (gameLog.peerId && gameLog.peerId == this.connectedUser.peerId && gameLog.id != this.lastId) {
          this.lastId = gameLog.id;
          const name = gameLog.worksheetName ? gameLog.worksheetName + ':' : '';
          const note = gameLog.textLog;
          const drawer = gameLog.drawer ? gameLog.drawer + '/' : '';
          const newData = `${drawer} ${name} ${note}\n`;
          this.saveToLocalStorage(newData);
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

  saveToLocalStorage(newData?) {
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
    localStorage.setItem(this.localStorageKey, dataToSave);
    this.logsText = '';
  }
}
