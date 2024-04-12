import { Component, OnInit, Output, EventEmitter, Input, SimpleChanges, ViewChildren, QueryList } from '@angular/core';
import moment, { Moment } from 'moment';
import { map, filter, forEach, sortBy } from 'lodash';

import { getTimeRangeOptions, timeStringToFloat, timeFloatToString } from '../../../../app/common/date-util';
import {
  IOfferingAvailability,
  IDropDownItem,
  ISlot,
  IOffering,
  IPatientTreatment,
  IBookingAssignment,
  IDailyBookingViewActionParams,
  ITherapistBookingViewData,
  ITreatmentListItem,
  IDailyBookingViewData,
} from '../../../../types';
import { getBookingDataByDays } from '../../../common/helpers/booking-utils';
import { DailyBookingViewActionType, WeekChange } from '../../../../constants';
import { TreatmentListComponent } from '../../../common/treatment-list/treatment-list.component';
import { TimePipe } from '../../../pipes/time.pipe';
import { focusOnMatMenuItem } from '../../backoffice-util';

@Component({
  selector: 'app-patient-booking',
  templateUrl: './patient-booking.component.html',
  styleUrls: ['./patient-booking.component.scss'],
})
export class BookingComponent implements OnInit {
  @Input() editedEntity;
  @Input() patientBooking: any[];
  @Input() currentDate: Moment;
  @Input() expertise: IPatientTreatment;
  @Input() dateToDisplay: string;
  @Output() goBack = new EventEmitter<void>();
  @Output() createBooking = new EventEmitter<IBookingAssignment>();
  @Output() weekChangeEvent = new EventEmitter<number>();
  @ViewChildren(TreatmentListComponent) treatmentLists: QueryList<TreatmentListComponent>;
  @ViewChildren('menuItem')
  menuItems: QueryList<any>;

  isAppointmentOptionsShown = false;
  DEFAULT_REPEAT = 52;
  repeatOptions: IDropDownItem[];
  selectedRepeat: number | string;
  MINUTES_INTERVAL = [0, 15, 30, 45];
  CUSTOM_HOURS_RANGE = [7, 0, 22, 0];
  possibleAppointmentTimes: string[] = [];
  appointmentTime: string;
  endAppointmentTime: string;
  offerings: IOffering[] = [];
  currentSlotDay: string;
  REPEAT_OPTIONS = [208, 104, 52, 15, 8, 6, 5, 1];
  allTherapistsBookingViewData: ITherapistBookingViewData[];
  clickActionType = DailyBookingViewActionType.CreateBooking;
  currentTherapistId: number;
  currentTherapistName: string;
  currentTreatmentListItem: ITreatmentListItem;

  constructor(private timePipe: TimePipe) {}

  focusOnMenuItem() {
    const timeString = this.timePipe.transform(this.currentTreatmentListItem.time);
    focusOnMatMenuItem(timeString, this.menuItems);
  }
  ngOnInit(): void {
    this.repeatOptions = this.getRepeatDropDownValues();
    this.offerings = this.editedEntity.offerings;
    this.initializeBookingDataByDays();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.editedEntity) {
      this.offerings = this.editedEntity.offerings;
      this.initializeBookingDataByDays();
    }
  }
  initializeBookingDataByDays = (): void => {
    this.allTherapistsBookingViewData = map(this.offerings, (offering) => {
      const { therapistId, therapistName, isUniqueWeek } = offering;
      return {
        therapistId,
        therapistName,
        isUniqueWeek,
        dailyBookingViewData: getBookingDataByDays(offering),
      };
    });
  };

  // Appointment Settings Modal Methods
  showAppointmentOptions = (params: IDailyBookingViewActionParams): void => {
    if (params.action !== DailyBookingViewActionType.CreateBooking) {
      return;
    }

    this.removeUnsavedBooking();

    this.currentTherapistId = params.therapistId;
    this.currentTherapistName = params.therapistName;
    this.currentSlotDay = moment.weekdays(params.day);
    this.selectedRepeat = this.DEFAULT_REPEAT;
    this.initializeCustomTime(params.time);
    this.isAppointmentOptionsShown = true;

    this.showNewBookingBeforeSave(params);
    this.updateTreatmentListAvailability(this.currentTherapistId);
  };

  showNewBookingBeforeSave = (params: IDailyBookingViewActionParams): void => {
    if (!params) {
      return;
    }
    const { day, time, therapistId, therapistName } = params;
    const therapistData = this.getCurrentTherapistDailyBookingData();
    if (!therapistData) {
      return;
    }

    const dailyBookingViewDataArray = therapistData.dailyBookingViewData;

    const dayDataArray = filter(
      dailyBookingViewDataArray,
      (dailyBookingViewDataItem: IDailyBookingViewData) => dailyBookingViewDataItem.day === params.day
    );

    const dayDataItem: IDailyBookingViewData =
      dayDataArray.length > 0
        ? dayDataArray[0]
        : {
            day,
            offeringAvailability: [],
            therapistId,
            therapistName,
            therapistsBooking: [],
          };

    if (dayDataArray.length === 0) {
      dailyBookingViewDataArray.push(dayDataItem);
      therapistData.dailyBookingViewData = sortBy(dailyBookingViewDataArray, ['day']);
    }

    const treatmentList = dayDataItem.therapistsBooking;
    const { expertiseId, expertiseName, maxPatientsExpertise, maxPatientsTreatment, duration } = this.expertise;
    const { patientId, patientName, techIssue: patientTechIssue, phone } = this.editedEntity;

    const maxPatientsExpertiseForCalculation = maxPatientsExpertise ? maxPatientsExpertise : Number.MAX_SAFE_INTEGER;
    const maxPatientsTreatmentForCalculation = maxPatientsTreatment ? maxPatientsTreatment : Number.MAX_SAFE_INTEGER;

    this.currentTreatmentListItem = {
      day,
      time,
      duration,
      maxPatients: Math.min(maxPatientsExpertiseForCalculation, maxPatientsTreatmentForCalculation),
      treatmentId: expertiseId,
      treatmentName: expertiseName,
      patientId,
      patientName,
      patientTechIssue,
      phone,
      therapistId,
      therapistName,
      isUnsavedItem: true,
    };
    treatmentList.push(this.currentTreatmentListItem);

    dayDataItem.therapistsBooking = sortBy(treatmentList, ['day', 'time']);
  };

  removeUnsavedBooking = (): void => {
    const therapistData = this.getCurrentTherapistDailyBookingData();
    if (!therapistData) {
      return;
    }

    forEach(therapistData.dailyBookingViewData, (dailyBookingViewDataItem: IDailyBookingViewData) => {
      dailyBookingViewDataItem.therapistsBooking = filter(
        dailyBookingViewDataItem.therapistsBooking,
        (item) => !item.isUnsavedItem
      );
    });

    therapistData.dailyBookingViewData = filter(
      therapistData.dailyBookingViewData,
      (dailyBookingItem) =>
        dailyBookingItem.offeringAvailability.length > 0 || dailyBookingItem.therapistsBooking.length > 0
    );
    this.updateTreatmentListAvailability(this.currentTherapistId);
  };

  getCurrentTherapistDailyBookingData = (): ITherapistBookingViewData => {
    if (!this.currentTherapistId) {
      return null;
    }

    const therapistBookingDataArray = filter(
      this.allTherapistsBookingViewData,
      (therapistBookingDataItem: ITherapistBookingViewData) =>
        therapistBookingDataItem.therapistId === this.currentTherapistId
    );

    return therapistBookingDataArray[0];
  };

  hideAppointmentOptions = (): void => {
    this.isAppointmentOptionsShown = false;
    this.removeUnsavedBooking();
  };

  saveAppointment = (): void => {
    const patientBookingForCurrentExpertise = filter(
      this.patientBooking,
      (booking) => booking.expertise_id === this.expertise.expertiseId
    );
    const shouldGoBack = this.expertise.timesPerWeek - patientBookingForCurrentExpertise.length <= 1;
    this.hideAppointmentOptions();
    this.createBooking.emit({
      patientTreatmentId: this.expertise.patientTreatmentId,
      therapistId: this.currentTherapistId,
      date: this.currentDate.day(this.currentSlotDay).format('DD-MM-YYYY'),
      time: timeStringToFloat(this.appointmentTime),
      timesToRepeat: +this.selectedRepeat,
      expertiseId: this.expertise.expertiseId,
      patientId: this.editedEntity.patientId,
    });
    if (shouldGoBack) {
      this.goBack.emit();
    }
  };

  initializeCustomTime = (initialTimeNumber: number): void => {
    const [startHour, startMinutes, endHour, endMinutes] = [...this.CUSTOM_HOURS_RANGE];
    this.setAppointmentTime(timeFloatToString(initialTimeNumber));
    this.possibleAppointmentTimes = getTimeRangeOptions(
      startHour,
      startMinutes,
      endHour,
      endMinutes,
      this.MINUTES_INTERVAL
    );
  };

  setAppointmentTime = (time: string): void => {
    const timeDecimal = timeStringToFloat(time);
    this.appointmentTime = time;
    this.endAppointmentTime = timeFloatToString(timeDecimal + this.expertise.duration / 60);
    if (this.currentTreatmentListItem) {
      this.currentTreatmentListItem.time = timeDecimal;
    }
  };

  backToSchedular = (): void => {
    this.goBack.emit();
  };

  trackByUser = (index: number, item: IOffering): number => {
    return item.therapistId;
  };

  trackByDay = (index: number, item: IOfferingAvailability): number => {
    return item.day;
  };

  trackByFrom = (index: number, item: ISlot): number => {
    return item.from;
  };

  trackByIndex = (index: number): number => {
    return index;
  };

  getRepeatDropDownValues = (): IDropDownItem[] => {
    return this.REPEAT_OPTIONS.map((value) => {
      return {
        id: value,
        name: value,
      };
    });
  };

  hasOfferings = (): boolean => this.offerings?.length > 0;

  updateTreatmentListAvailability = (therapistId: number) => {
    this.treatmentLists.forEach((element) => {
      if (element.getTherapistId() === therapistId) {
        element.refreshAvailability();
      }
    });
  };

  setNextWeek = () => this.weekChangeEvent.emit(WeekChange.Forward);
  setPreviousWeek = () => this.weekChangeEvent.emit(WeekChange.Backward);
  setCurrentWeek = () => this.weekChangeEvent.emit(WeekChange.Current);
}
