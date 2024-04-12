import { Component, Input } from '@angular/core';

import { IUserLogEntry } from '../../../types';

@Component({
  selector: 'app-user-log-entry',
  templateUrl: './user-log-entry.component.html',
  styleUrls: ['./user-log-entry.component.scss'],
})
export class UserLogEntryComponent {
  @Input() logEntry: IUserLogEntry;
}
