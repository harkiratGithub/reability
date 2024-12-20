import { AppActions } from 'src/app/app.actions';
import { select } from '@angular-redux/store';
import { Subscription, Observable } from 'rxjs';
import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import { localeData } from 'moment';

export interface GeneralModalData {
  header?: string;
  content?: GENERAL_MODAL_CONTENT;
  acceptBtnImg?: string;
  acceptBtnImgHover?: string;
  declineBtnImg?: string;
  declineBtnImgHover?: string;
  approveCallback?: any;
  declineCallback?: any;
  positionRelativeToElement?: HTMLElement;
  isTherapist?: boolean
  modalStyle: GENERAL_MODAL_STYLE,
  patient: any
}

export interface InnerModalInterface {
  isValid: boolean,
  innerModalValue: any
}

export interface OuterModalInterface {
  isApproveClicked: boolean,
  dataFromInnerForm: InnerModalInterface
  rows?: any[];
}

export enum GENERAL_MODAL_CONTENT {
  NONE = 0,
  SEND_FAST_LOGIN = 1,
  MSG = 2,
}

export enum GENERAL_MODAL_STYLE {
  BLUE = 0,
  WHITE = 1,
}

@Component({
  selector: 'app-general-modal',
  templateUrl: './general-modal.component.html',
  styleUrls: ['./general-modal.component.scss']
})
export class GeneralModalComponent implements OnInit {
  @select(state => state.global.generalModalMsg) readonly generalModalMsg$: Observable<string>;

  header: string;
  content: GENERAL_MODAL_CONTENT;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  declineBtnImg: string;
  declineBtnImgHover: string;
  approveCallback: any;
  declineCallback: any;
  isTherapist: boolean
  @Output() isApprove = new EventEmitter<OuterModalInterface>();
  dataFromInnerForm: InnerModalInterface;
  generalModalMsgSubscription: Subscription;
  generalMsg: string;
  modalStyle: GENERAL_MODAL_STYLE = GENERAL_MODAL_STYLE.WHITE
  patient: any;
  positionRelativeToElement: HTMLElement;
  matDialogConfig;
  rect;
  position;
  // isSwappedScreen: boolean;

  constructor(
    public dialogRef: MatDialogRef<GeneralModalComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: GeneralModalData,
    public appActions: AppActions,
  ) {
    dialogRef.disableClose = true;
    (this.positionRelativeToElement = this.dialogData.positionRelativeToElement),
      (this.header = this.dialogData.header),
      (this.content = this.dialogData.content),
      (this.acceptBtnImg = this.dialogData.acceptBtnImg),
      (this.acceptBtnImgHover = this.dialogData.acceptBtnImgHover),
      (this.declineBtnImg = this.dialogData.declineBtnImg),
      (this.declineBtnImgHover = this.dialogData.declineBtnImgHover),
      (this.approveCallback = this.dialogData.approveCallback),
      (this.isTherapist = this.dialogData.isTherapist),
      // (this.isSwappedScreen = this.dialogData.isSwappedScreen),
      (this.declineCallback = this.dialogData.declineCallback),
      (this.patient = this.dialogData.patient);
  }

  ngOnInit(): void {
    this.matDialogConfig = new MatDialogConfig();
    if (this.positionRelativeToElement) {
      this.rect = this.positionRelativeToElement.getBoundingClientRect()
      this.position = this.getModalRelativePosition();
      this.matDialogConfig.position = this.position;
      this.dialogRef.updatePosition(this.matDialogConfig.position);
    }

    this.generalModalMsgSubscription = this.generalModalMsg$.subscribe((msg: string) => {
      if (!msg || msg === "") { return }
      this.generalMsg = msg;
      this.content = GENERAL_MODAL_CONTENT.MSG;
      setTimeout(() => { this.appActions.closeGeneralModal() }, 5000)
    });
  }

  // getter for enum
  public get generalModelContent(): typeof GENERAL_MODAL_CONTENT {
    return GENERAL_MODAL_CONTENT;
  }

  public get generalModelStyle(): typeof GENERAL_MODAL_STYLE {
    return GENERAL_MODAL_STYLE;
  }

  getModalRelativePosition = () => {
    const left = this.rect.left + (this.rect.width / 2) - (750 / 2);
    let top = this.rect.top + (this.rect.height / 2) - (400 / 2);
    // if (this.isSwappedScreen) {
    //   top += 50;
    // }
    return { left: `${left}px`, top: `${top}px` };
  }

  handleApprove() {
    if (this.dataFromInnerForm.isValid) { // check if the inner form is valid
      this.isApprove.emit({ isApproveClicked: true, dataFromInnerForm: this.dataFromInnerForm })
    }
  }

  handleDecline() {
    this.isApprove.emit({ isApproveClicked: false, dataFromInnerForm: null })
  }

  getActionButtonClass() {
    return `action-btn ${this.isTherapist ? 'therapist' : 'patient'}`;
  }

  isGeneralModel(modelType: GENERAL_MODAL_CONTENT) {
    return modelType === this.content
  }

  getDataFromModal(event) {
    this.dataFromInnerForm = event;
  }

  isGeneralModelStyle(modelStyle: GENERAL_MODAL_STYLE) {
    return modelStyle === this.modalStyle
  }
}
