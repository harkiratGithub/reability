import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import moment from 'moment';
import _ from 'lodash';

import { CalendarManagementDialogComponent } from '../calendar-management-dialog/calendar-management-dialog.component';
import { DayText, END_OF_DAY, HOUR_SPLIT, START_OF_DAY, WEEK_DAYS } from '../../../../constants';

@Component({
  selector: 'app-availability-management',
  templateUrl: './availability-management.component.html',
  styleUrls: ['./availability-management.component.scss'],
})
export class AvailabilityManagementComponent implements OnInit, OnChanges {
  @Input() availability: Record<DayText, number[]>;
  @Input() isUniqueWeek: boolean;
  @Output() setTherapistAvailability = new EventEmitter<any>();
  @Output() resetTherapistAvailability = new EventEmitter<void>();
  @Output() setIsDuringLocalChanges = new EventEmitter<boolean>();
  @Output() deleteTherapistAvailability = new EventEmitter();

  dayHeadings = _.take(_.map(DayText), WEEK_DAYS);
  localAvailability: Record<DayText, number[]> = {
    Sunday: [],
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
  };
  workingMinutesIntervals = [0, 15, 30, 45];
  possibleShiftTimings = [];
  pickedDays = {
    Sunday: false,
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
  };
  duringLocalChanges = false;

  constructor(public dialog: MatDialog) {}

  ngOnInit(): void {
    this.possibleShiftTimings = this.getShiftPossibleTimes();
  }

  initializePickedDays = () => {
    _.forIn(this.availability, (value, key) => {
      this.pickedDays[key] = value.length > 0;
    });
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes.availability && !_.isEqual(changes.availability.currentValue, changes.availability.previousValue)) {
      this.localAvailability = this.availability;
      this.initializePickedDays();
    }
  }

  setShiftTime = (dayShiftsHours: number[], time: string, indx: number) => {
    const decimalTime = this.timeStringToFloat(time);
    //shift end time
    if (indx % 2 === 1 && decimalTime > dayShiftsHours[indx - 1]) dayShiftsHours[indx] = decimalTime;

    //shift start time
    if (indx % 2 === 0 && decimalTime < dayShiftsHours[indx + 1]) dayShiftsHours[indx] = decimalTime;
    if (indx % 2 === 0 && decimalTime >= dayShiftsHours[indx + 1]) {
      if (decimalTime < END_OF_DAY) {
        dayShiftsHours[indx + 1] = decimalTime + 1 / HOUR_SPLIT;
        dayShiftsHours[indx] = decimalTime;
      }
    }
    this.setChanges();
  };

  timeStringToFloat = (textTime: string): number => {
    const hoursMinutes = textTime.split(/[.:]/);
    const hours = parseInt(hoursMinutes[0], 10);
    const minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1], 10) : 0;
    return hours + minutes / 60;
  };

  timeFloatToString = (decimalTime: number): string => {
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime % 1) * 60).toString();
    return `${hours}:${_.padStart(minutes, 2, '0')}`;
  };

  getShiftPossibleTimes = (): number[] => {
    let possibleShiftTimings = [];
    for (let hour = START_OF_DAY; hour < END_OF_DAY; hour++) {
      this.workingMinutesIntervals.forEach((minutes) => {
        possibleShiftTimings.push(this.getSpecificTime(hour, minutes));
      });
    }
    possibleShiftTimings.push(this.getSpecificTime(END_OF_DAY));
    return possibleShiftTimings;
  };

  isDayPicked = (day: DayText): boolean => this.localAvailability[day]?.length > 0 || this.pickedDays[day];

  toggleWorkingDay = (day: DayText): void => {
    this.pickedDays[day] = !this.pickedDays[day];
    if (this.pickedDays[day]) {
      return;
    }
    this.dropShifts(day);
    this.setChanges();
  };

  dropShifts = (day: DayText): void => {
    this.localAvailability[day] = [];
    this.setChanges();
  };

  dropShift = (dayShifts: number[], index: number): void => {
    dayShifts.splice(index - 1, 2);
    this.setChanges();
  };

  addShift = (day: DayText, start = 9, end = 10): void => {
    this.localAvailability[day] = [...this.localAvailability[day], start, end];
    this.setChanges();
  };

  getSpecificTime = (hour: number, minutes: number = 0, seconds: number = 0, format: string = 'HH:mm'): string =>
    moment()
      .set({
        hours: hour,
        minutes: minutes,
        seconds: seconds,
      })
      .format(format);

  trackByIndex = (index: number): number => index;

  setChanges = (isThisWeek = true, isFinal = false) => {
    this.setTherapistAvailability.emit({ availability: this.localAvailability, isThisWeek, isFinal });
    this.setIsDuringLocalChanges.emit(!isFinal);
    this.duringLocalChanges = !isFinal;
  };

  resetChanges = () => {
    this.resetTherapistAvailability.emit();
    this.setIsDuringLocalChanges.emit(false);
    this.duringLocalChanges = false;
  };

  openDialog() {
    const dialogRef = this.dialog.open(CalendarManagementDialogComponent, {
      width: '452px',
      panelClass: 'custom-therapist-dialog',
    });

    dialogRef.afterClosed().subscribe((response) => {
      if (_.isNil(response)) {
        return;
      }
      const { isThisWeek, isAllWeeks } = response;
      if (isThisWeek === false && isAllWeeks === false) {
        return;
      }
      this.setChanges(isThisWeek, true);
    });
  }

  restoreDefault() {
    this.deleteTherapistAvailability.emit();
  }
}
