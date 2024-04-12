import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { PatientWebRtcService } from 'src/app/patient/services/patient_web_rtc.service';
import { Subscription } from 'rxjs/internal/Subscription';

export interface DialogData {
  header: string;
  content: string;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  declineBtnImg: string;
  declineBtnImgHover: string;
  isTherapist: boolean;
  declineCallback: any;
  approveCallback: any;
  positionRelativeToElement: HTMLElement;
  has_backdrop: boolean;
  isSplitScreen: boolean;
  peerId: string;
  isSwappedScreen: boolean;
}

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit {
  header: string;
  content: string;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  declineBtnImg: string;
  declineBtnImgHover: string;
  isTherapist: boolean;
  approveCallback: any;
  declineCallback: any;
  positionRelativeToElement: HTMLElement;
  isSplitScreen: boolean;
  isSwappedScreen: boolean;
  rect;
  position;
  matDialogConfig;
  subscription: Subscription = new Subscription();
  @Output() isApprove = new EventEmitter<boolean>();

  constructor(
    public dialogRef: MatDialogRef<ModalComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData,
    private patientWebRtcService: PatientWebRtcService
  ) {
    dialogRef.disableClose = true;
    (this.positionRelativeToElement = this.dialogData.positionRelativeToElement),
      (this.header = this.dialogData.header),
      (this.content = this.dialogData.content),
      (this.acceptBtnImg = this.dialogData.acceptBtnImg),
      (this.acceptBtnImgHover = this.dialogData.acceptBtnImgHover),
      (this.declineBtnImg = this.dialogData.declineBtnImg),
      (this.declineBtnImgHover = this.dialogData.declineBtnImgHover),
      (this.isTherapist = this.dialogData.isTherapist),
      (this.approveCallback = this.dialogData.approveCallback),
      (this.isSplitScreen = this.dialogData.isSplitScreen),
      (this.isSwappedScreen = this.dialogData.isSwappedScreen),
      (this.declineCallback = this.dialogData.declineCallback);
  }

  ngOnInit() {
    this.matDialogConfig = new MatDialogConfig();
    this.rect = this.positionRelativeToElement.getBoundingClientRect()
    this.position = this.getModalRelativePosition();

    this.matDialogConfig.position = this.position;
    this.dialogRef.updatePosition(this.matDialogConfig.position);

    this.subscription.add(this.patientWebRtcService.isInSplitScreen.subscribe(isSplitScreen => {
      this.isSplitScreen = isSplitScreen;
      setTimeout(() => {
        this.updateDialogPosition();
        if (!this.isSwappedScreen) {
          this.dialogRef.removePanelClass([this.matDialogConfig.panelClass, 'split-screen-swapped-panel-popup', 'split-screen-panel-popup']);
          this.matDialogConfig.panelClass = this.isSplitScreen ? 'split-screen-panel-popup' : '';
          this.dialogRef.addPanelClass(this.matDialogConfig.panelClass);
        }
        if (this.positionRelativeToElement.offsetParent === null || window.getComputedStyle(this.positionRelativeToElement).display === 'none') {
          this.dialogRef.addPanelClass('hide-modal');
        } else {
          this.dialogRef.removePanelClass('hide-modal');
        }
      }, 300);
    }));
    this.subscription.add(this.patientWebRtcService.isSwappedScreen.subscribe(data => {
      if (data && data.peerId === this.dialogRef.id) {
        this.isSwappedScreen = data.status;
        setTimeout(() => {
          this.updateDialogPosition();
          this.dialogRef.removePanelClass([this.matDialogConfig.panelClass, 'split-screen-swapped-panel-popup', 'split-screen-panel-popup']);
          this.matDialogConfig.panelClass = this.isSwappedScreen ? 'split-screen-swapped-panel-popup' : this.isSplitScreen ? 'split-screen-panel-popup' : '';
          this.dialogRef.addPanelClass(this.matDialogConfig.panelClass);
          if (this.positionRelativeToElement.offsetParent === null || window.getComputedStyle(this.positionRelativeToElement).display === 'none') {
            this.dialogRef.addPanelClass('hide-modal');
          } else {
            this.dialogRef.removePanelClass('hide-modal');
          }
        }, 300);
      }
    }));
  }

  updateDialogPosition = () => {
    this.rect = this.positionRelativeToElement.getBoundingClientRect()
    this.position = this.getModalRelativePosition();
    this.matDialogConfig.position = this.position;
    this.dialogRef.updatePosition(this.matDialogConfig.position);
  }

  getModalRelativePosition = () => {
    const left = this.rect.left + (this.rect.width / 2) - (750 / 2);
    let top = this.rect.top + (this.rect.height / 2) - (400 / 2);
    if (this.isSwappedScreen) {
      top += 50;
    }
    return { left: `${left}px`, top: `${top}px` };
  }

  handleApprove() {
    this.isApprove.emit(true);
    this.subscription.unsubscribe();
  }

  handleDecline() {
    this.isApprove.emit(false);
    this.subscription.unsubscribe();
  }

  getActionButtonClass() {
    return `action-btn ${this.isTherapist ? 'therapist' : 'patient'}`;
  }
}
