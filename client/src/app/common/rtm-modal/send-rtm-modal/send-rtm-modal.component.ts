import { Subscription } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { InnerModalInterface } from '../../general-modal/general-modal.component';
import { ThemePalette } from '@angular/material/core';
import moment from 'moment';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

@Component({
  selector: 'app-send-rtm-modal',
  templateUrl: './send-rtm-modal.component.html',
  styleUrls: ['./send-rtm-modal.component.scss'],
})
export class SendRTMModalComponent implements OnInit {
  customForm: FormGroup;
  @Output() returnedData = new EventEmitter<InnerModalInterface>();
  @Input() patient;
  subscription: Subscription = new Subscription();
  isFormValid: boolean = true;
  isDateValid: boolean = true;
  reviewActivityTypes = [
    'Intro Phone Call - Answered',
    'Intro Phone Call - Not Answered',
    'Intro Video Call - Not Answered',
    'Follow-Up Phone Call - Answered',
    'Follow-Up Phone Call - Not Answered',
    'Follow-Up Video Call - Answered',
    'Follow-Up Video Call - Not Answered',
    'In-App Chat',
    'Email',
    'Text/SMS',
    'Reviewing Data',
    'Communicating with Provider',
    'Other/Non-Billable',
  ];

  public disabled = false;
  public touchUi = true;
  public minDate;
  public maxDate;
  public stepHour = 1;
  public stepMinute = 1;
  public stepSecond = 1;
  public color: ThemePalette = 'primary';

  constructor() {}

  ngOnInit(): void {
    this.customForm = new FormGroup({
      date_time: new FormControl(null, Validators.required),
      review_activity: new FormControl(null, Validators.required),
      minutes_spent: new FormControl(null, [Validators.required, Validators.min(0), Validators.max(1440)]),
      note: new FormControl(null, Validators.required),
    });
    this.setMaxDate();
    this.customForm.statusChanges.subscribe((status) => {
      this.isFormValid = status === 'VALID';
      this.returnedData.emit({
        innerModalValue: {
          date_time: this.getDateTime(this.customForm.controls.date_time.value),
          review_activity: this.customForm.controls.review_activity.value,
          minutes_spent: this.customForm.controls.minutes_spent.value,
          note: this.customForm.controls.note.value,
        },
        isValid: this.isFormValid,
      });
    });
  }

  setMaxDate = () => {
    const now = new Date();
    this.maxDate = new Date();
    this.maxDate.setDate(now.getDate());
  };

  getDateTime = (date_time) => {
    return date_time && moment(date_time).isValid() && date_time >= new Date()
      ? moment(date_time).unix().toString()
      : null;
  };

  checkIfValidData_Date(value) {
    if (moment(value).isValid()) return true;
    return false;
  }
}
