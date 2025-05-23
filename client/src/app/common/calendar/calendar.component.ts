import { Component, Input, OnChanges, OnInit, SimpleChanges, Output, EventEmitter } from '@angular/core';
import _ from 'lodash';
import moment, { Moment } from 'moment';

import {
  Day,
  DayText,
  END_OF_DAY,
  HOUR_SPLIT,
  START_OF_DAY,
  TechIssueValues,
  TITLE_COLUMNS,
  WEEK_DAYS,
  MAX_BOOKING_PER_SLOT,
} from 'src/constants';
import {
  IAssignment,
  IPatientBooking,
  ITherapistAvailability,
  ITherapistBooking,
  IDeleteBookingParams,
  IWeek,
  IPatient,
} from 'src/types';
import { IPosition } from '../directives/grid.item.directive';
import { IMenuOption } from '../side-menu/side-menu.component';
import { BookingDeleteOptions } from '../../backoffice/backoffice-constants';
import { getWeek } from '../../common/date-util';
import { getTitleByTechIssue } from '../helpers/booking-utils';

interface ITableDayHeading {
  text: string;
  number: number;
  isToday: boolean;
}

interface ITherapistCalendarItem {
  therapistBooking: ITherapistBooking;
  position: IPosition;
}

//sizes must match scss sizes
const HEADER_COLUMNS_WIDTH = 70;
const HEADER_HEIGHT = 54;

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit, OnChanges {
  @Input() dayOfWeekToShow: Moment;
  @Input() therapistAvailability?: ITherapistAvailability;
  @Input() therapistBookingDetails?: ITherapistBooking[];
  @Input() patientBookingDetails?: IPatientBooking[];
  @Input() showDelete: boolean = true;
  @Output() deleteBooking = new EventEmitter<IDeleteBookingParams[]>();
  @Output() updatePatient = new EventEmitter<IPatient>();

  showModal = false;
  todayId: number = moment().day();
  workingHours: number[] = _.range(START_OF_DAY, END_OF_DAY);
  hourSplit = Array(HOUR_SPLIT);
  WeekDays = Array(WEEK_DAYS);

  tableDaysHeadings: ITableDayHeading[] = [];
  weeklyAvailabilityPositions: IPosition[][] = [];
  weeklyBookingPositions: IPosition[] = [];
  coPatients: IAssignment[];
  patientBooking: IPatientBooking;
  sideMenuOptions: IMenuOption[];
  coPatientPersonalMenuOptions: IMenuOption[] = [];
  currentWeekDetails: IWeek;
  currentCoPatient: IAssignment;
  therapistCalendarItems: ITherapistCalendarItem[] = [];

  CLASS_NAMES = {
    AVAILABLE: 'available',
    NOT_AVAILABLE: 'unavailable',
  };

  gridItemClick(gridItemData) {
    if (Array.isArray(gridItemData)) {
      this.coPatients = gridItemData;
    }
    if (gridItemData.patientBooking) {
      this.patientBooking = gridItemData.patientBooking;
    }
    this.resetSelectedCoPatients();
    this.showModal = true;
  }

  gridColumnsWidth = `${HEADER_COLUMNS_WIDTH}px repeat(${WEEK_DAYS * MAX_BOOKING_PER_SLOT}, 1fr)`;
  gridRowsHeight = `${HEADER_HEIGHT}px repeat(${(END_OF_DAY - START_OF_DAY) * HOUR_SPLIT}, 25px)`;

  ngOnInit(): void {
    this.tableDaysHeadings = this.setTableDaysHeadings(this.dayOfWeekToShow);
    this.currentWeekDetails = getWeek(this.dayOfWeekToShow);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.dayOfWeekToShow) {
      this.tableDaysHeadings = this.setTableDaysHeadings(this.dayOfWeekToShow);
      this.currentWeekDetails = getWeek(this.dayOfWeekToShow);
    }
    if (changes.therapistAvailability) {
      this.weeklyAvailabilityPositions = this.setAvailability(this.therapistAvailability.availability);
    }
    if (changes.therapistBookingDetails && this.therapistBookingDetails) {
      this.therapistCalendarItems = this.getTherapistCalendarItems(this.therapistBookingDetails);
    }
    if (changes.patientBookingDetails && this.patientBookingDetails) {
      this.weeklyBookingPositions = this.getPatientBookingPositions(this.patientBookingDetails);
    }
  }

  setTableDaysHeadings = (date) => {
    const isItCurrentWeek = this.isItCurrentWeek(date);
    return _.reduce(
      moment.weekdaysShort(),
      (result, weekday, dayIndx) => {
        if (dayIndx >= WEEK_DAYS) {
          return result;
        } else {
          const params = {
            text: weekday,
            number: date.day(dayIndx).format('DD').replace(/^0+/, ''),
            isToday: isItCurrentWeek && this.isItToday(dayIndx),
          };
          return [...result, params];
        }
      },
      []
    );
  };

  isItCurrentWeek = (day: Moment): boolean => day.isSame(moment(), 'week');

  isItToday = (dayId: number): boolean => dayId === this.todayId;

  hoursToPositions = (day: number, availableHours: number[]) =>
    _.reduce(
      availableHours,
      (result, value, indx) => {
        if (indx % 2 === 0) {
          const startRow = this.getRow(value);
          const endRow = this.getRow(availableHours[indx + 1]);
          const startCol = this.getCol(day);
          const endCol = startCol + MAX_BOOKING_PER_SLOT;
          return [...result, { startRow, endRow, startCol, endCol }];
        }
        return [...result];
      },
      []
    );

  hourToPosition = (day: number, value: number, positionNumber: number = 0, positionSize = MAX_BOOKING_PER_SLOT) => {
    const startRow = this.getRow(value);
    const endRow = startRow + 1;
    const startCol = this.getCol(day) + positionNumber;
    const endCol = startCol + positionSize;
    return { startRow, endRow, startCol, endCol };
  };

  getRow = (value: number): number => (value - START_OF_DAY) * HOUR_SPLIT + TITLE_COLUMNS;

  getCol = (dayNumber: number): number => dayNumber * MAX_BOOKING_PER_SLOT + TITLE_COLUMNS;

  setAvailability = (availability) =>
    _.map(availability, (value: number[], key: DayText) => {
      switch (key) {
        case DayText.SUN:
          return this.hoursToPositions(Day.SUN, value);
        case DayText.MON:
          return this.hoursToPositions(Day.MON, value);
        case DayText.TUE:
          return this.hoursToPositions(Day.TUE, value);
        case DayText.WED:
          return this.hoursToPositions(Day.WED, value);
        case DayText.THU:
          return this.hoursToPositions(Day.THU, value);
        case DayText.FRI:
          return this.hoursToPositions(Day.FRI, value);
        case DayText.SAT:
          return this.hoursToPositions(Day.SAT, value);
      }
    });

  getTherapistCalendarItems = (booking: ITherapistBooking[]): ITherapistCalendarItem[] =>
    _.reduce(
      booking,
      (therapistCalendarItems: ITherapistCalendarItem[], value: ITherapistBooking) => {
        const therapistCalendarItemsByAssignments = this.getTherapistCalendarItemsFromTherapistBooking(value);
        return [...therapistCalendarItems, ...therapistCalendarItemsByAssignments];
      },
      []
    );

  getPatientBookingPositions = (booking: IPatientBooking[]) =>
    _.map(booking, (value) => this.hourToPosition(value.day, value.time));

  trackByDayNumber = (index: number, item: any) => item.number;

  trackByIndex = (index: number) => index;

  onItemModalClose = () => {
    if (this.showModal) {
      this.showModal = false;
    }
    this.resetSelectedCoPatients();
  };

  getModalHeaderTitle = (): string => {
    return this.coPatients && this.coPatients.length > 1 ? 'Group Session' : 'Session';
  };

  getModalTitle = (): string => {
    return this.coPatients ? '' : this.patientBooking.therapistName;
  };

  getModalSubtitle = (): string => {
    return this.coPatients ? '' : this.patientBooking.expertiseName;
  };

  getSideMenuOptions = (): IMenuOption[] => {
    return [
      {
        title: 'This day and time',
        callback: () => {
          this.onDeleteBooking(BookingDeleteOptions.AllTreatmentsOnSameDayAndTime);
        },
      },
      {
        title: 'All',
        callback: () => {
          this.onDeleteBooking(BookingDeleteOptions.AllTreatmentsOnSamePrescription);
        },
      },
    ];
  };

  setCoPatientPersonalMenuOptions = (): void => {
    this.coPatientPersonalMenuOptions = _.map(TechIssueValues, (issue) => {
      const title = getTitleByTechIssue(issue);
      const iconPath =
        this.currentCoPatient.techIssue === issue ? { iconPath: '../../../../assets/backoffice/icon_check.svg' } : {};
      const techReason = issue === TechIssueValues.empty ? { techReason: '' } : {};
      return {
        title,
        ...iconPath,
        callback: () => {
          this.updatePatient.emit({
            id: this.currentCoPatient.patientId,
            techIssue: issue,
            availabilityStatus: 'available' as 'available' | 'offline' | 'unavailable' | 'do_not_disturb',
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

  updatePatientReason = (patient: IPatient): void => this.updatePatient.emit(patient);

  resetSelectedCoPatients = () => {
    if (!this.coPatients) {
      return;
    }
    _.forEach(this.coPatients, (coPatient) => {
      coPatient.selected = false;
    });
  };

  getDeleteAction = (): IMenuOption => {
    if (!this.showDelete) {
      return null;
    }

    return {
      title: 'Delete This',
      callback: () => {
        this.onDeleteBooking(BookingDeleteOptions.SpecificTreatment);
      },
    };
  };

  onDeleteBooking = (deleteOption: BookingDeleteOptions) => {
    this.therapistBookingDetails
      ? this.onDeleteTherapistBooking(deleteOption)
      : this.onDeletePatientBooking(deleteOption);
    this.onItemModalClose();
  };

  onDeletePatientBooking = (deleteOption: BookingDeleteOptions) => {
    this.deleteBooking.emit([
      {
        deleteOption,
        patientTreatmentId: this.patientBooking.patientTreatmentId,
        year: this.currentWeekDetails.year,
        week: this.currentWeekDetails.weekNumber,
        day: this.patientBooking.day,
        time: this.patientBooking.originalTime,
        originalTime: this.patientBooking.originalTime,
      },
    ]);
  };

  onDeleteTherapistBooking = (deleteOption: BookingDeleteOptions) => {
    this.deleteBooking.emit(this.getTherapistDeleteBookingData(deleteOption));
  };

  onSelectedCoPatient = (coPatient: IAssignment) => {
    this.currentCoPatient = coPatient;
    this.setCoPatientPersonalMenuOptions();
  };

  getTherapistSlotClassName = (booking: ITherapistBooking): string => {
    return booking.availability ? this.CLASS_NAMES.AVAILABLE : this.CLASS_NAMES.NOT_AVAILABLE;
  };

  getPatientSlotClassName = (booking: IPatientBooking): string => {
    return booking.availability ? this.CLASS_NAMES.AVAILABLE : this.CLASS_NAMES.NOT_AVAILABLE;
  };

  getPositionSize = (numberOfItemsInSlot: number): number => {
    if (MAX_BOOKING_PER_SLOT % numberOfItemsInSlot !== 0) {
      return 1;
    }
    return MAX_BOOKING_PER_SLOT / numberOfItemsInSlot;
  };

  getTherapistCalendarItemsFromTherapistBooking = (therapistBooking: ITherapistBooking): ITherapistCalendarItem[] => {
    const { assignments, day, time } = therapistBooking;
    const positionSize = this.getPositionSize(assignments.length);
    return _.map(assignments, (assignment, index) => {
      const therapistBookingWithOneAssignment = {
        ...therapistBooking,
        assignments: [assignment],
      };

      return {
        therapistBooking: therapistBookingWithOneAssignment,
        position: this.hourToPosition(day, time, index * positionSize, positionSize),
      };
    });
  };

  getTherapistDeleteBookingData = (deleteOption: BookingDeleteOptions): IDeleteBookingParams[] =>
    _.map(this.coPatients, (coPatient) => {
      return {
        deleteOption,
        patientTreatmentId: coPatient.patientTreatmentId,
        year: this.currentWeekDetails.year,
        week: this.currentWeekDetails.weekNumber,
        day: coPatient.day,
        time: coPatient.time,
        originalTime: coPatient.time,
      };
    });
}
