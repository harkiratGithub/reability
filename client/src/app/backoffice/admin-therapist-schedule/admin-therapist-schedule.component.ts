import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { cloneDeep, filter, forEach, isNil, map, sortBy } from 'lodash';
import moment, { Moment } from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';

import { IMenuOption } from '../../common/side-menu/side-menu.component';
import { AjaxAdmin } from '../../common/services/ajax_admin.service';
import { DailyBookingViewActionType, DayText, TechIssueValues, WeekChange } from '../../../constants';
import {
  ITherapistAvailability,
  ITherapistBooking,
  IDeleteBookingParams,
  IAssignment,
  IDailyBookingViewActionParams,
  IDailyBookingViewData,
  IOfferingAvailability,
  ISlot,
  ITreatmentListItem,
  IPatient,
  ITherapistBookingViewData,
  IBackOfficeInternalViewAction,
} from '../../../types';
import { getWeek } from '../../common/date-util';
import {
  deleteOrReplaceBooking,
  getAllProfessionsBookingsNumber,
  getBookingDataByDays,
  getFormattedTherapistBookingForCalendar,
  getFormattedTherapistsBooking,
  getTitleByTechIssue,
  sortAndMergeOverlaps,
} from '../../common/helpers/booking-utils';
@Component({
  selector: 'app-admin-therapist-schedule',
  templateUrl: './admin-therapist-schedule.component.html',
  styleUrls: ['./admin-therapist-schedule.component.scss'],
})
export class AdminScheduleComponent implements OnInit {
  @Input() currentTab;
  @Input() editedEntity;
  @Output() goBack = new EventEmitter<void>();
  @Output() deleteBooking = new EventEmitter<IDeleteBookingParams[]>();

  therapistName;
  currentDate: Moment = moment();
  headerDateString: string;
  therapistAvailability: ITherapistAvailability = {};
  bookingData: ITherapistBooking[] = [];
  loggedInUserId = 0;
  isFormerDates = false;
  showListView = true;
  showModal = false;
  isDuringLocalChanges = false;
  coPatients: IAssignment[];
  bookingDataByDays: IDailyBookingViewData[] = [];
  therapistBookingViewData: ITherapistBookingViewData;
  availabilityClickActionType = DailyBookingViewActionType.None;
  bookingClickActionType = DailyBookingViewActionType;
  coPatientPersonalMenuOptions: IMenuOption[] = [];
  currentCoPatient: IAssignment;
  treatmentListItems: ITreatmentListItem[];
  isUniqueWeek = false;

  constructor(private http: AjaxAdmin, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.headerDateFormat();
    if (this.editedEntity?.user_id) this.loggedInUserId = this.editedEntity.user_id;
    this.therapistName = this.editedEntity?.first_name;
    this.getTherapistAvailability();
  }

  headerDateFormat() {
    const firstDayOfWeek = this.currentDate.day(0).format('MMMM DD');
    const lastDayOfWeek = this.currentDate.day(6).format('MMMM DD, YYYY');
    this.headerDateString = `${firstDayOfWeek} - ${lastDayOfWeek}`;
  }

  weekChange(weekChangeId: number) {
    this.currentDate =
      weekChangeId > 0
        ? moment(this.currentDate)
            .weekday(0)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .subtract(1, 'weeks')
        : moment(this.currentDate).weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).add(1, 'weeks');
    this.getTherapistAvailability();
    this.isFormerDates = this.currentDate < moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    this.headerDateFormat();
  }

  getTherapistAvailability = () => {
    const currentWeek = getWeek(this.currentDate);
    return this.http
      .getTherapistAvailability(
        currentWeek.weekNumber,
        currentWeek.year,
        this.editedEntity?.user_id,
        this.editedEntity.id
      )
      .toPromise()
      .then((therapistSchedule: any) => {
        this.isUniqueWeek = therapistSchedule.isUniqueWeek;
        this.therapistAvailability.availability = therapistSchedule?.availability;
        this.therapistAvailability = cloneDeep(this.therapistAvailability);
        this.bookingData = getFormattedTherapistBookingForCalendar(therapistSchedule?.booking.therapistBooking);
        this.treatmentListItems = getFormattedTherapistsBooking(therapistSchedule?.booking.therapistBooking);
        this.setBookingDataByDays();
      });
  };

  updatePatient = (patient: IPatient) =>
    this.http.updatePatient(patient).subscribe(() => this.getTherapistAvailability());

  onDeleteBooking(deleteBookingParams: IDeleteBookingParams[]) {
    this.http.deleteBooking(deleteBookingParams).subscribe(() => {
      this.getTherapistAvailability();
    });
  }

  backClicked() {
    this.goBack.emit();
  }

  showTreatmentDetailsModal = (params: IDailyBookingViewActionParams) => {
    if (params.action !== DailyBookingViewActionType.ShowCoPatients) {
      this.showModal = false;
      return;
    }

    const currentDayBookings = filter(this.bookingDataByDays, (dayBooking) => dayBooking.day === params.day);
    const currentTimeBooking = filter(
      currentDayBookings[0].therapistsBooking,
      (booking) => booking.time === params.time
    );
    this.coPatients = map(currentTimeBooking, (timeBooking) => ({
      patientId: timeBooking.patientId,
      patientName: timeBooking.patientName,
      phone: timeBooking.phone,
      email: '',
      sessionType: null,
      careGiverName: '',
      careGiverPhone: '',
      selected: false,
      techIssue: timeBooking.patientTechIssue,
      techReason: timeBooking.patientTechReason,
      patientTreatmentId: 0,
      day: timeBooking.day,
      time: timeBooking.time,
    }));

    this.showModal = true;
  };

  onSelectedCoPatient = (coPatient: IAssignment) => {
    this.currentCoPatient = coPatient;
    this.setCoPatientPersonalMenuOptions();
  };

  getModalHeaderTitle = (): string => {
    return this.coPatients && this.coPatients.length > 1 ? 'Group Session' : 'Session';
  };

  onItemModalClose = () => {
    this.showModal = false;
  };

  setCoPatientPersonalMenuOptions = (): void => {
    this.coPatientPersonalMenuOptions = map(TechIssueValues, (issue) => {
      const iconPath =
        this.currentCoPatient.techIssue === issue ? { iconPath: '../../../../assets/backoffice/icon_check.svg' } : {};
      const techReason = issue === TechIssueValues.empty ? { techReason: '' } : {};
      return {
        title: getTitleByTechIssue(issue),
        ...iconPath,
        callback: () => {
          this.updatePatient({
            id: this.currentCoPatient.patientId,
            techIssue: issue,
            ...techReason,
          });
          this.currentCoPatient.techIssue = issue;
          if (issue === TechIssueValues.empty) {
            this.currentCoPatient.techReason = '';
          }
        },
      };
    });
  };

  setShowListView = (showListView: boolean) => {
    this.showListView = showListView;
  };

  setBookingDataByDays = () => {
    let offeringAvailability: IOfferingAvailability[] = [];
    forEach(Object.keys(this.therapistAvailability.availability), (dayString) => {
      if (this.therapistAvailability.availability[dayString].length === 0) {
        return;
      }
      const slots: ISlot[] = [];
      const times = this.therapistAvailability.availability[dayString];
      for (let i = 0; i < times.length; i += 2) {
        slots.push({ from: times[i], to: times[i + 1] });
      }
      offeringAvailability.push({ day: moment.weekdays().indexOf(dayString), slots, totalBusyHours: 0 });
    });
    offeringAvailability = sortBy(offeringAvailability, 'day');
    this.bookingDataByDays = getBookingDataByDays({
      therapistId: 0,
      therapistName: '',
      offeringAvailability,
      therapistBooking: this.treatmentListItems,
    });

    this.therapistBookingViewData = {
      therapistId: 0,
      therapistName: '',
      dailyBookingViewData: this.bookingDataByDays,
    };
  };

  resetTherapistAvailability = () => this.getTherapistAvailability();

  setTherapistAvailability = async ({ availability, isThisWeek, isFinal }) => {
    this.therapistAvailability = { ...this.therapistAvailability, availability };
    if (!isFinal) {
      return;
    }
    try {
      let year, week;

      forEach(availability, (shift: number[], day: DayText) => {
        if (shift.length === 0) {
          return;
        }
        availability[day] = sortAndMergeOverlaps(shift);
      });

      if (!isThisWeek) {
        week = 0;
        year = 0;
      } else {
        const currentWeek = getWeek(this.currentDate);
        year = currentWeek.year;
        week = currentWeek.weekNumber;
      }
      await this.http
        .setTherapistAvailability(this.therapistAvailability, week, year, this.editedEntity.user_id, this.currentDate)
        .toPromise();

      this.getTherapistAvailability();

      if (week === 0)
        this.snackBar.open('Default schedule was updated', '', {
          duration: 3000,
        });
      else
        this.snackBar.open('Week exception was saved', '', {
          duration: 3000,
        });
    } catch (e) {
      console.error(e);
    }
  };

  deleteTherapistAvailability = async () => {
    try {
      const currentWeek = getWeek(this.currentDate);
      const { weekNumber: week, year } = currentWeek;
      const userId = this.editedEntity.user_id;

      await this.http.deleteTherapistAvailability(userId, week, year).toPromise();

      this.getTherapistAvailability();

      this.snackBar.open('Availability was restored to default', '', {
        duration: 3000,
      });
    } catch (e) {
      console.error(e);
    }
  };

  setIsDuringLocalChanges = (isDuringLocalChanges: boolean) => {
    this.isDuringLocalChanges = isDuringLocalChanges;
  };
  getTherapistNameAndBookingNumber() {
    const bookingNumber = getAllProfessionsBookingsNumber([this.therapistBookingViewData]);
    return `${this.therapistName} (${bookingNumber})`;
  }
  handleDeleteOrReplaceBooking = (action: IBackOfficeInternalViewAction) => {
    deleteOrReplaceBooking(action, this.http)
      .then(() => this.getTherapistAvailability())
      .catch((err) => console.log(err));
  };
}
