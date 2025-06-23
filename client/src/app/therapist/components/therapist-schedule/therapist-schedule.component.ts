import { Component, Input, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment, { Moment } from 'moment';
import { cloneDeep, filter, forEach, isNil, map, sortBy } from 'lodash';

import { DayText, WeekChange, TechIssueValues, DailyBookingViewActionType } from '../../../../constants';
import { AjaxService } from '../../services/ajax.service';
import {
  ITherapistAvailability,
  ITherapistBooking,
  IDailyBookingViewData,
  IOfferingAvailability,
  ISlot,
  ITreatmentListItem,
  IAssignment,
  IDailyBookingViewActionParams,
  IPatient,
  ITherapistBookingViewData,
  IBackOfficeInternalViewAction,
} from '../../../../types';
import { getWeek } from '../../../common/date-util';
import {
  getFormattedTherapistBookingForCalendar,
  getFormattedTherapistsBooking,
  getBookingDataByDays,
  getTitleByTechIssue,
  sortAndMergeOverlaps,
  deleteOrReplaceBooking,
} from '../../../common/helpers/booking-utils';
import { isMobileDevice } from '../../../common/utils';
import { IMenuOption } from '../../../common/side-menu/side-menu.component';
import { setAudioStreamsToComponent } from '../../../common/utils';

@Component({
  selector: 'app-therapist-schedule',
  templateUrl: './therapist-schedule.component.html',
  styleUrls: ['./therapist-schedule.component.scss'],
})
export class TherapistScheduleComponent implements OnInit {
  @Input() loggedInUser;
  @Input() audioStreams: MediaStream[];

  currentDate: Moment = moment();
  headerDateString: string;
  therapistAvailability: ITherapistAvailability = {};
  bookingData: ITherapistBooking[] = [];
  isDuringLocalChanges = false;
  showMenu = !isMobileDevice();
  showListView = true;
  bookingDataByDays: IDailyBookingViewData[] = [];
  therapistBookingViewData: ITherapistBookingViewData;
  treatmentListItems: ITreatmentListItem[];
  showModal = false;
  coPatients: IAssignment[];
  coPatientPersonalMenuOptions: IMenuOption[] = [];
  currentCoPatient: IAssignment;
  bookingClickActionType = DailyBookingViewActionType;
  availabilityClickActionType = DailyBookingViewActionType.None;
  isUniqueWeek = false;

  constructor(private ajax: AjaxService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.headerDateFormat();
    this.therapistBookingViewData = {
      therapistId: 0,
      therapistName: '',
      dailyBookingViewData: [],
    };

    this.getTherapistAvailability();

    const audioContainerElement = document.getElementById('audio-container-schedule');
    setAudioStreamsToComponent(audioContainerElement, this.audioStreams);
  }

  headerDateFormat() {
    const firstDayOfWeek = this.currentDate.day(0).format('MMMM DD');
    const lastDayOfWeek = this.currentDate.day(6).format('MMMM DD, YYYY');
    this.headerDateString = `${firstDayOfWeek} - ${lastDayOfWeek}`;
  }

  weekChange(weekChangeId: number) {
    switch (weekChangeId) {
      case WeekChange.Forward:
        this.currentDate = moment(this.currentDate)
          .weekday(0)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .add(1, 'weeks');
        this.getTherapistAvailability();
        break;
      case WeekChange.Backward:
        const backDate = moment(this.currentDate)
          .weekday(0)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .subtract(1, 'weeks');
        if (backDate >= moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })) {
          this.currentDate = backDate;
          this.getTherapistAvailability();
        }
        break;
      case WeekChange.Current:
      default:
        this.currentDate = moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        this.getTherapistAvailability();
    }
    this.headerDateFormat();
  }
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
      await this.ajax
        .setTherapistAvailability(this.therapistAvailability, week, year, +this.loggedInUser?.peerId, this.currentDate)
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
      const userId = +this.loggedInUser?.peerId;

      await this.ajax.deleteTherapistAvailability(userId, week, year).toPromise();
      this.getTherapistAvailability();
      this.snackBar.open('Availability was restored to default', '', {
        duration: 3000,
      });
    } catch (e) {
      console.error(e);
    }
  };

  resetTherapistAvailability = () => this.getTherapistAvailability();

  getTherapistAvailability = () => {
    const currentWeek = getWeek(this.currentDate);
    this.ajax
      .getTherapistAvailability(
        currentWeek.weekNumber,
        currentWeek.year,
        +this.loggedInUser?.peerId,
        +this.loggedInUser?.id
      )
      .toPromise()
      .then((therapistSchedule) => {
        this.isUniqueWeek = therapistSchedule.isUniqueWeek;
        this.therapistAvailability.availability = therapistSchedule?.availability;
        this.therapistAvailability = cloneDeep(this.therapistAvailability);
        this.bookingData = getFormattedTherapistBookingForCalendar(therapistSchedule?.booking.therapistBooking);
        this.treatmentListItems = getFormattedTherapistsBooking(therapistSchedule?.booking.therapistBooking);
        this.setBookingDataByDays();
      });
  };

  setIsDuringLocalChanges = (isDuringLocalChanges: boolean) => {
    this.isDuringLocalChanges = isDuringLocalChanges;
  };

  toggleMenu = () => (this.showMenu = !this.showMenu);

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

  onItemModalClose = () => {
    this.showModal = false;
  };

  getModalHeaderTitle = (): string => {
    return this.coPatients && this.coPatients.length > 1 ? 'Group Session' : 'Session';
  };

  onSelectedCoPatient = (coPatient: IAssignment) => {
    this.currentCoPatient = coPatient;
    this.setCoPatientPersonalMenuOptions();
  };

  setCoPatientPersonalMenuOptions = (): void => {
    console.log('[Camera Status] Current patient tech issue:', this.currentCoPatient.techIssue);
    this.coPatientPersonalMenuOptions = map(TechIssueValues, (issue) => {
      const iconPath =
        this.currentCoPatient.techIssue === issue ? { iconPath: '../../../../assets/backoffice/icon_check.svg' } : {};
      const techReason = issue === TechIssueValues.empty ? { techReason: '' } : {};
      return {
        title: getTitleByTechIssue(issue),
        ...iconPath,
        callback: () => {
          console.log('[Camera Status] Updating patient tech issue:', {
            patientId: this.currentCoPatient.patientId,
            newIssue: issue,
            currentIssue: this.currentCoPatient.techIssue
          });
          this.updatePatient({
            id: this.currentCoPatient.patientId,
            techIssue: issue,
            availabilityStatus: 'available',
            ...techReason,
          });
          this.currentCoPatient.techIssue = issue;
          if (issue === TechIssueValues.empty) {
            this.currentCoPatient.techReason = '';
          }
          console.log('[Camera Status] Patient tech issue updated:', this.currentCoPatient.techIssue);
        },
      };
    });
  };

  updatePatient = (patient: IPatient) =>
    this.ajax.updatePatient(patient).subscribe(() => this.getTherapistAvailability());

  handleDeleteOrReplaceBooking = (action: IBackOfficeInternalViewAction) => {
    deleteOrReplaceBooking(action, this.ajax)
      .then(() => this.getTherapistAvailability())
      .catch((err) => console.log(err));
  };
}
