import { Subscription } from 'rxjs';
import { FormGroup, FormControl } from '@angular/forms';
import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { InnerModalInterface } from '../../general-modal/general-modal.component';
import { ThemePalette } from '@angular/material/core';
import moment from 'moment'
import { AjaxService } from 'src/app/therapist/services/ajax.service';

@Component({
  selector: 'app-send-fast-login-modal',
  templateUrl: './send-fast-login-modal.component.html',
  styleUrls: ['./send-fast-login-modal.component.scss']
})
export class SendFastLoginModalComponent implements OnInit {
  customForm: FormGroup;
  @Output() returnedData = new EventEmitter<InnerModalInterface>();
  @Input() patient;
  subscription: Subscription = new Subscription();
  isFormValid: boolean = true;
  isRegexValid: boolean = true;
  errorText: string = "Field is not valid"
  isDateValid: boolean = true;
  methods = ["Email", "Phone"];
  linkTypes = ["Video Consultation", "Studio"];
  selectedMethodData;
  inviteMethod;
  userData;

  public disabled = false;
  public showSpinners = true;
  public showSeconds = false;
  public touchUi = true;
  public enableMeridian = false;
  public minDate;
  public maxDate: moment.Moment;
  public stepHour = 1;
  public stepMinute = 1;
  public stepSecond = 1;
  public color: ThemePalette = 'primary';

  constructor(private ajaxService: AjaxService) {
  }

  ngOnInit(): void {
    this.customForm = new FormGroup({
      email_or_phone: new FormControl(),
      date_time: new FormControl(),
      link_type: new FormControl("Video Consultation"),
    });
    this.ajaxService.getPatientEmailAndPhone(this.patient.id, this.patient.userId).toPromise().then(contactData => {
      this.userData = contactData;

      this.selectedMethodData = this.userData.email;
      if (!this.selectedMethodData) {
        this.selectedMethodData = this.userData.phone;
      }
      this.customForm.patchValue({ email_or_phone: this.selectedMethodData })
      // this.customForm.controls.email_or_phone = this.selectedMethodData;
      // this.updateFormValues({ email_or_phone: this.selectedMethodData });
    })
    this.inviteMethod = new FormControl(this.methods[0]);
    this.setMinDate();
    this.customForm.statusChanges.subscribe((status) => {
      this.isFormValid = status === 'VALID';
      this.returnedData.emit({
        innerModalValue:
        {
          email_or_phone: this.customForm.controls.email_or_phone.value || this.selectedMethodData,
          date_time: this.getDateTime(this.customForm.controls.date_time.value),
          link_type: this.customForm.controls.link_type.value || "Video Consultation"
        }, isValid: this.isFormValid
      });
    })

    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        this.updateFormValues(state);
      })
    );
  }

  updateFormValues = (state) => {
    this.isRegexValid = this.checkIfValidData_Email_Or_Phone(state.email_or_phone || this.selectedMethodData);
    if (this.isFormValid && this.isRegexValid) {
      this.returnedData.emit({
        innerModalValue:
        {
          email_or_phone: state.email_or_phone || this.selectedMethodData,
          date_time: this.getDateTime(state.date_time),
          link_type: state.link_type
        }, isValid: true
      });
    } else {
      this.returnedData.emit({ innerModalValue: null, isValid: false });
    }
  }

  setMinDate = () => {
    const now = new Date();
    this.minDate = new Date();
    this.minDate.setDate(now.getDate());
  }

  getDateTime = (date_time) => {
    return date_time && moment(date_time).isValid() && date_time >= new Date()
      ? moment(date_time).unix().toString() : null;
  }

  checkIfValidData_Email_Or_Phone(value: String) {
    if (!value) { return false }
    let regularExpression;
    if (value.includes('@')) { // Email
      regularExpression = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    } else { //Phone
      regularExpression = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
    }
    return regularExpression.test(String(value).toLowerCase());
  }

  checkIfValidData_Date(value) {
    if (moment(value).isValid())
      return true
    return false;
  }

  getUserData = (contactMehtod) => {
    switch (contactMehtod) {
      case 'Email':
        this.selectedMethodData = this.userData.email || '';
        break;
      case 'Phone':
        this.selectedMethodData = this.userData.phone || '';
        break;
    }
    this.customForm.patchValue({ email_or_phone: this.selectedMethodData })
  }
}
