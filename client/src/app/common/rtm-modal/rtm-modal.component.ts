import { AppActions } from 'src/app/app.actions';
import { select } from '@angular-redux/store';
import { Subscription, Observable } from 'rxjs';
import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogConfig } from '@angular/material/dialog';
import moment, { localeData } from 'moment';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

export interface RTMModalData {
  header?: string;
  content?: RTM_MODAL_CONTENT;
  acceptBtnImg?: string;
  acceptBtnImgHover?: string;
  declineBtnImg?: string;
  declineBtnImgHover?: string;
  approveCallback?: any;
  declineCallback?: any;
  positionRelativeToElement?: HTMLElement;
  isTherapist?: boolean;
  modalStyle: RTM_MODAL_STYLE;
  patient: any;
}

export interface InnerModalInterface {
  isValid: boolean;
  innerModalValue: any;
}

export interface RTMOuterModalInterface {
  isApproveClicked: boolean;
  dataFromInnerForm: InnerModalInterface;
}

export enum RTM_MODAL_CONTENT {
  NONE = 0,
  SEND_FAST_LOGIN = 1,
  MSG = 2,
}

export enum RTM_MODAL_STYLE {
  BLUE = 0,
  WHITE = 1,
}

export enum SHOW_RTM_MODAL_CONTENT {
  NONE = 0,
  SEND_FAST_LOGIN = 1,
  MSG = 2,
}

export enum SHOW_RTM_MODAL_STYLE {
  BLUE = 0,
  WHITE = 1,
}

@Component({
  selector: 'app-rtm-modal',
  templateUrl: './rtm-modal.component.html',
  styleUrls: ['./rtm-modal.component.scss'],
})
export class RTMModalComponent implements OnInit {
  @select((state) => state.global.rtmModalMsg) readonly rtmModalMsg$: Observable<string>;

  header: string;
  content: RTM_MODAL_CONTENT;
  acceptBtnImg: string;
  acceptBtnImgHover: string;
  declineBtnImg: string;
  declineBtnImgHover: string;
  approveCallback: any;
  declineCallback: any;
  isTherapist: boolean;
  @Output() isApprove = new EventEmitter<RTMOuterModalInterface>();
  dataFromInnerForm: InnerModalInterface;
  rtmModalMsgSubscription: Subscription;
  generalMsg: string;
  modalStyle: RTM_MODAL_STYLE = RTM_MODAL_STYLE.WHITE;
  patient: any;
  positionRelativeToElement: HTMLElement;
  matDialogConfig: MatDialogConfig<any>;
  rect: DOMRect;
  position: { left: string; top: string };
  // isSwappedScreen: boolean;

  filteredData: any[] = [];
  isTableVisible = false;
  isLoading: boolean = false;

  constructor(
    private ajax: AjaxService,
    public dialogRef: MatDialogRef<RTMModalComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: RTMModalData,
    public appActions: AppActions
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
      this.rect = this.positionRelativeToElement.getBoundingClientRect();
      this.position = this.getModalRelativePosition();
      this.matDialogConfig.position = this.position;
      this.dialogRef.updatePosition(this.matDialogConfig.position);
    }

    this.rtmModalMsgSubscription = this.rtmModalMsg$.subscribe((msg: string) => {
      if (!msg || msg === '') {
        return;
      }
      this.generalMsg = msg;
      this.content = RTM_MODAL_CONTENT.MSG;
      setTimeout(() => {
        this.appActions.closeRTMModal();
      }, 5000);
    });
    this.getAllRtmData();
  }

  private async getAllRtmData() {
    this.isLoading = true;
    try {
      if (this.content !== 1) {
        const response = await this.ajax
          .getAllRtmReport({ month: String(moment().month() + 1), year: String(moment().year()) })
          .toPromise();

        if (response && response.data) {
          const { allData } = response.data;
          const desiredPatientId = this.patient?.id;
          const filteredAllData = allData
            .sort(
              (a: { since: string }, b: { since: string }) => new Date(b.since).getTime() - new Date(a.since).getTime()
            )
            .filter((entry: any) => entry.patient_id === desiredPatientId);
          this.filteredData = filteredAllData;
          this.isTableVisible = this.filteredData.length > 0;
        }
      }
    } catch (err) {
      console.error('Error fetching RTM Report:', err);
    } finally {
      this.isLoading = false; 
    }
  }

  // getter for enum
  public get rtmModelContent(): typeof RTM_MODAL_CONTENT {
    return RTM_MODAL_CONTENT;
  }

  public get generalModelStyle(): typeof RTM_MODAL_STYLE {
    return RTM_MODAL_STYLE;
  }

  getModalRelativePosition = () => {
    const left = this.rect.left + this.rect.width / 2 - 750 / 2;
    let top = this.rect.top + this.rect.height / 2 - 400 / 2;
    // if (this.isSwappedScreen) {
    //   top += 50;
    // }
    return { left: `${left}px`, top: `${top}px` };
  };

  handleApprove() {
    if (this.dataFromInnerForm?.isValid) {
      // check if the inner form is valid
      this.isApprove.emit({ isApproveClicked: true, dataFromInnerForm: this.dataFromInnerForm });
    }
  }

  handleDecline() {
    this.isApprove.emit({ isApproveClicked: false, dataFromInnerForm: null });
  }

  getActionButtonClass() {
    return `action-btn ${this.isTherapist ? 'therapist' : 'patient'}`;
  }

  isRtmModel(modelType: RTM_MODAL_CONTENT) {
    return modelType === this.content;
  }

  getDataFromModal(event: InnerModalInterface) {
    this.dataFromInnerForm = event;
  }

  isRtmModelStyle(modelStyle: RTM_MODAL_STYLE) {
    return modelStyle === this.modalStyle;
  }
}
