import { Component, OnInit, Input, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { sumBy, forEach } from 'lodash';
import moment, { Moment } from 'moment';

import {
  IBookingViewShownParams,
  IPatientTreatment,
  IOffering,
  IBookingAssignment,
  IPatientBooking,
  IDeleteBookingParams,
} from '../../../../types';
import { WeekChange } from 'src/constants';
@Component({
  selector: 'app-patient-schedule',
  templateUrl: './patient-schedule.component.html',
  styleUrls: ['./patient-schedule.component.scss'],
})
export class AddEditPatientScheduleComponent implements OnInit {
  @Input() editedEntity;
  @Output() bookingViewShown = new EventEmitter<IBookingViewShownParams>();
  @Output() goBack = new EventEmitter<void>();
  @Output() weekChanged = new EventEmitter<Date>();
  @Output() createBooking = new EventEmitter<IBookingAssignment>();
  @Output() deleteBooking = new EventEmitter<IDeleteBookingParams[]>();

  isMainView = true;
  treatments: IPatientTreatment[] = [];
  therapistsAvailabilities: IOffering[] = [];
  totalTimesPerWeek = 0;
  totalBooked = 0;
  currentDate: Moment = moment();
  headerDateString: string;
  patientBooking: IPatientBooking[] = [];
  currentExpertise: IPatientTreatment;

  constructor() {}

  ngOnInit(): void {
    this.headerDateFormat();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.editedEntity) {
      this.initializeTreatmentsData();
      this.initializeTherapistsAvailabilities();
    }
  }

  initializeTreatmentsData(): void {
    if (!this.editedEntity.treatments) {
      return;
    }
    this.treatments = this.editedEntity.treatments;
    this.totalBooked = sumBy(this.treatments, 'booked');
    this.totalTimesPerWeek = sumBy(this.treatments, 'timesPerWeek');
    this.patientBooking = this.getCalendarPatientBooking();
  }

  initializeTherapistsAvailabilities(): void {
    if (!this.editedEntity.therapistsAvailabilities) {
      return;
    }
    this.therapistsAvailabilities = this.editedEntity.therapistsAvailabilities;
  }

  showBookingView = (treatment: IPatientTreatment) => {
    if (this.isFullyBooked(treatment)) {
      return;
    }
    const params: IBookingViewShownParams = {
      currentDate: this.currentDate,
      expertiseId: treatment.expertiseId,
      patientId: this.editedEntity.patientId,
    };
    this.bookingViewShown.emit(params);
    this.currentExpertise = treatment;
    this.isMainView = false;
  };

  showSchedularView = () => {
    this.isMainView = true;
  };

  isFullyBooked(treatment: IPatientTreatment): boolean {
    return treatment.timesPerWeek <= treatment.booked;
  }

  trackByExpertise = (index: number, item: IPatientTreatment): number => {
    return item.expertiseId;
  };

  headerDateFormat() {
    const firstDayOfWeek = this.currentDate.day(0).format('MMMM DD');
    const lastDayOfWeek = this.currentDate.day(6).format('MMMM DD, YYYY');
    this.headerDateString = `${firstDayOfWeek} - ${lastDayOfWeek}`;
  }

  weekChange(weekChangeId: number, loadOfferings = false) {
    switch (weekChangeId) {
      case WeekChange.Forward:
        this.currentDate = moment(this.currentDate)
          .weekday(0)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .add(1, 'weeks');
        break;
      case WeekChange.Backward:
        const backDate = moment(this.currentDate)
          .weekday(0)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .subtract(1, 'weeks');
        this.currentDate = backDate;
        break;
      case WeekChange.Current:
      default:
        this.currentDate = moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    }
    this.headerDateFormat();
    this.weekChanged.emit(this.currentDate.toDate());
    if (loadOfferings) {
      this.bookingViewShown.emit({
        currentDate: this.currentDate,
        expertiseId: this.currentExpertise.expertiseId,
        patientId: this.editedEntity.patientId,
      });
    }
  }

  backClicked() {
    this.goBack.emit();
  }

  onCreateBooking(bookingToSave: IBookingAssignment) {
    this.createBooking.emit(bookingToSave);
    this.bookingViewShown.emit({
      currentDate: this.currentDate,
      expertiseId: this.currentExpertise.expertiseId,
      patientId: this.editedEntity.patientId,
    });
  }

  onDeleteBooking(deleteBookingParams: IDeleteBookingParams[]) {
    this.deleteBooking.emit(deleteBookingParams);
  }

  getCalendarPatientBooking(): IPatientBooking[] {
    const patientBookings: IPatientBooking[] = [];
    forEach(this.editedEntity.patientBooking, (appointment) => {
      for (let i = appointment.time; i < appointment.time + appointment.duration / 60; i += 0.25) {
        const { name, therapist_first_name, therapist_last_name, week_day, time, treatment_id } = appointment;
        patientBookings.push({
          availability: true,
          expertiseName: name,
          therapistName: `${therapist_first_name} ${therapist_last_name}`,
          day: moment.weekdays().indexOf(week_day),
          time: i,
          originalTime: time,
          patientTreatmentId: treatment_id,
        });
      }
    });
    return patientBookings;
  }
}
