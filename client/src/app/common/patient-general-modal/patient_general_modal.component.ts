import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';

export interface DialogData {
  header: string;
  content: string;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  positionRelativeToElement: HTMLElement;
  timeout: number;
  acceptBtnText?: string;
}

@Component({
  selector: 'patient-general-modal',
  templateUrl: './patient_general_modal.component.html',
  styleUrls: ['./patient_general_modal.component.scss'],
})
export class PatientGeneralModalComponent implements OnInit {
  header: string;
  content: string;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  positionRelativeToElement: HTMLElement;
  rect;
  timeout;
  acceptBtnText;
  @Output() isApprove = new EventEmitter<boolean>();

  timeoutId: any;

  constructor(
    public dialogRef: MatDialogRef<PatientGeneralModalComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData
  ) {
    dialogRef.disableClose = true;
    (this.positionRelativeToElement = this.dialogData.positionRelativeToElement),
      (this.header = this.dialogData.header),
      (this.content = this.dialogData.content),
      (this.acceptBtnImg = this.dialogData.acceptBtnImg),
      (this.timeout = this.dialogData.timeout),
      (this.acceptBtnImgHover = this.dialogData.acceptBtnImgHover),
      (this.acceptBtnText = this.dialogData.acceptBtnText);
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
    return `action-btn patient`;
  }

  createPopupTimeut = () => {
    const timeout = this.timeout;
    if (!timeout) {
      return;
    }
    if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => {
        this.isApprove.emit(false);
      }, timeout);
    }
  };

  clearPopupTimeut = () => {
    if (!this.timeout) {
      return;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  };
}
