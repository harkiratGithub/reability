import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import _ from 'lodash';
import { focusOnMatMenuItem } from '../../backoffice/backoffice-util';

import { START_OF_DAY, END_OF_DAY } from '../../../constants';
import { getSpecificTime, timeFloatToString, timeStringToFloat } from '../date-util';
@Component({
  selector: 'app-from-to-select',
  templateUrl: './from-to-select.component.html',
  styleUrls: ['./from-to-select.component.scss'],
})
export class FromToSelectComponent implements OnInit {
  @Input() startTime: string = '09:00';
  @Input() endTime: string = '10:15';
  @Input() endTimeAutoAdjusted: boolean = true;
  @ViewChildren('menuItem')
  menuItems: QueryList<any>;

  workingMinutesIntervals = [0, 15, 30, 45];
  possibleShiftTimings: string[] = [];
  localStartTime: string;
  localEndTime: string;
  timeDiff: number;

  ngOnInit(): void {
    this.localStartTime = this.startTime;
    this.localEndTime = this.endTime;
    if (this.endTimeAutoAdjusted) {
      const start = timeStringToFloat(this.startTime);
      const end = timeStringToFloat(this.endTime);
      this.timeDiff = end - start;
    }
    this.possibleShiftTimings = this.getShiftPossibleTimes();
  }

  getShiftPossibleTimes = (): string[] => {
    const possibleShiftTimings = [];
    for (let hour = START_OF_DAY; hour < END_OF_DAY; hour++) {
      this.workingMinutesIntervals.forEach((minutes) => {
        possibleShiftTimings.push(getSpecificTime(hour, minutes));
      });
    }
    possibleShiftTimings.push(getSpecificTime(END_OF_DAY));
    return possibleShiftTimings;
  };

  focusOnMenuItem(time: string) {
    focusOnMatMenuItem(time, this.menuItems);
  }

  setLocalEndTime(time: string) {
    this.localEndTime = time;
  }
  setLocalStartTime(time: string) {
    if (this.endTimeAutoAdjusted) {
      const timeInDec = timeStringToFloat(time);
      this.setLocalEndTime(timeFloatToString(timeInDec + this.timeDiff));
    }
    this.localStartTime = time;
  }
  getLocalStartTime() {
    return this.localStartTime;
  }
  getLocalEndTime() {
    return this.localEndTime;
  }
  trackByIndex = (index: number): number => {
    return index;
  };
}
