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
    'Reviewing Data and Settings',
    'Intro Phone Call - Answered',
    'Intro Phone Call - Not Answered',
    // 'Intro Video Call - Not Answered',
    'Follow-Up Phone Call - Answered',
    'Follow-Up Phone Call - Not Answered',
    // 'Follow-Up Video Call - Answered',
    // 'Follow-Up Video Call - Not Answered',
    // 'In-App Chat',
    'Email',
    'Text/SMS',
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
      minutes_spent: new FormControl(null, [
        Validators.required,
        this.timeFormatValidator,
        this.maxDurationValidator,
      ]),
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

maxDurationValidator = (control: FormControl): { [key: string]: any } | null => {
  if (!control.value) {
    return null;
  }
  const totalSeconds = +this.convertTimeToSeconds(control.value);
  const maxAllowedSeconds = 59 * 60 + 59; 
  if (totalSeconds < maxAllowedSeconds) {
    return null;
  }
  return { maxDurationExceeded: true };
};

timeFormatValidator(control: FormControl): { [key: string]: any } | null {
  const timeRegex = /^([0-5]?\d):([0-5]\d)$/;
  if (!control.value || timeRegex.test(control.value)) {
    return null;
  }
  return { invalidTime: true };
}

convertTimeToSeconds(time: string): number {
  const [minutes, seconds] = time.split(':').map(Number);
  return minutes * 60 + seconds;
}

getFormattedTime(): string {
  const timeSpent = this.customForm.controls.minutes_spent.value;
  if (timeSpent) {
    const totalSeconds = this.convertTimeToSeconds(timeSpent);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return '00:00';
}

  onTimeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 2) value = value.slice(0, 2) + ':' + value.slice(2);
    if (value.length > 5) value = value.slice(0, 5);
    if (this.convertTimeToSeconds(value) > 59 * 60 + 59) {
      value = '59:59';
    }
    input.value = value;
    this.customForm?.controls?.time_spent?.setValue(value, { emitEvent: false });
  }

  setMaxDate = () => {
    const now = new Date();
    this.maxDate = new Date();
    this.maxDate.setDate(now.getDate());
  };

  getDateTime = (date_time) => {
    return date_time && moment(date_time).isValid() && date_time <= new Date()
      ? moment(date_time)
          .set({ hour: moment().hour(), minute: moment().minute(), second: moment().second() })
          .format('YYYY-MM-DD HH:mm:ss.SSSZZ')
      : null;
  };

  checkIfValidData_Date(value) {
    if (moment(value).isValid()) return true;
    return false;
  }
}
