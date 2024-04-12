import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface DisconnectedVideoSession {
  header: string;
  content: string;
}

@Component({
  selector: 'app-disconnected-modal',
  templateUrl: './video_session_disconneted_modal.component.html',
  styleUrls: ['./video_session_disconneted_modal.component.scss']
})
export class DisconnectedVideoSessionComponent {
  header: string;
  content: string;
  timeoutId: any;

  @Output() leaveSession = new EventEmitter<boolean>();

  constructor(
    public dialogRef: MatDialogRef<DisconnectedVideoSessionComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: DisconnectedVideoSession
  ) {
    dialogRef.disableClose = true;
    (this.header = this.dialogData.header),
      (this.content = this.dialogData.content);
  }

}
