import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { TIME_TO_ANSWER_CALL_MS } from '../../../constants';
import { MOBILE_OR_SMALL_RESOLUTION } from '../utils';

export interface DialogData {
  header: string;
  content: string;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  positionRelativeToElement: HTMLElement;
  timeout: number;
}

@Component({
  selector: 'app-call-modal',
  templateUrl: './call_modal.component.html',
  styleUrls: ['./call_modal.component.scss'],
})
export class CallModalComponent implements OnInit {
  header: string;
  content: string;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  positionRelativeToElement: HTMLElement;
  rect;
  timeout;
  isMobile = false;
  @Output() isApprove = new EventEmitter<boolean>();

  timeoutId: any;

  constructor(
    public dialogRef: MatDialogRef<CallModalComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData
  ) {
    dialogRef.disableClose = true;
    (this.positionRelativeToElement = this.dialogData.positionRelativeToElement),
      (this.header = this.dialogData.header),
      (this.content = this.dialogData.content),
      (this.acceptBtnImg = this.dialogData.acceptBtnImg),
      (this.timeout = this.dialogData.timeout),
      (this.acceptBtnImgHover = this.dialogData.acceptBtnImgHover);
    this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    window.addEventListener('resize', () => {
      this.isMobile = MOBILE_OR_SMALL_RESOLUTION ? true : false;
    });
  }

  ngOnInit() {
    const matDialogConfig = new MatDialogConfig();
    if (this.positionRelativeToElement) {
      this.rect = this.positionRelativeToElement.getBoundingClientRect();
      let position = this.getModalRelativePosition();

      matDialogConfig.position = position;
      this.dialogRef.updatePosition(matDialogConfig.position);
    }

    this.createPopupTimeut();
  }

  getModalRelativePosition = () => {
    const left = this.rect.left + this.rect.width / 2 - 750 / 2;
    const top = this.rect.top + this.rect.height / 2 - 400 / 2;
    return { left: `${left}px`, top: `${top}px` };
  };

  handleApprove = () => {
    this.isApprove.emit(true);
    this.clearPopupTimeut();
  };

  getActionButtonClass() {
    return this.isMobile ? `action-btn patient-mobile` : `action-btn patient`;
  }

  createPopupTimeut = () => {
    const timeout = this.timeout || TIME_TO_ANSWER_CALL_MS;
    if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.isApprove.emit(false);
      }, timeout);
    }
  };

  clearPopupTimeut = () => {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };
}
