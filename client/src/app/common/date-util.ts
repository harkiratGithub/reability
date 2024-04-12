import moment, { Moment } from 'moment';
import { padStart } from 'lodash';

import { IWeek } from '../../types';
import { weekNumberFromDate } from './week-number.helper';

export const getLast7DaysFrom = (dayFrom) => {
  const formatDate = (date) => {
    let dd = date.getDate();
    let mm = date.getMonth() + 1;
    const yyyy = date.getFullYear();
    if (dd < 10) {
      dd = '0' + dd;
    }
    if (mm < 10) {
      mm = '0' + mm;
    }
    // date = mm + '-' + dd + '-' + yyyy;
    date = yyyy + '-' + mm + '-' + dd;
    return date;
  };
  const result = new Array(7);
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i + dayFrom);
    const dateValue = formatDate(d);
    result[6 - i] = dateValue;
  }
  return result;
};

export const getSecondsFromTimeString = (timeStr) => {
  const parts = timeStr.split(':');
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
};

export const addTwoDurationTimeTogether = (firstTime, secondTime) => {
  const timeStringToSec = (timeStr) => {
    const parts = timeStr.split(':');
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  };
  const pad = (num) => {
    if (num < 10) {
      return '0' + num;
    } else {
      return '' + num;
    }
  };
  const formatTime = (seconds) => {
    return [pad(Math.floor(seconds / 3600)), pad(Math.floor(seconds / 60) % 60), pad(seconds % 60)].join(':');
  };

  return formatTime(timeStringToSec(firstTime) + timeStringToSec(secondTime));
};

export const getWeek = (date: Moment): IWeek => {
  const momentDate = moment(date, 'DD-MM-YYYY');
  return weekNumberFromDate(momentDate.format('YYYY'), momentDate.format('MM'), momentDate.format('DD'));
};

export const getSpecificTime = (
  hour: number,
  minutes: number = 0,
  seconds: number = 0,
  format: string = 'HH:mm'
): string =>
  moment()
    .set({
      hours: hour,
      minutes: minutes,
      seconds: seconds,
    })
    .format(format);

export const getTimeRangeOptions = (
  startHour: number,
  startMinutes: number,
  endHour: number,
  endMinutes: number,
  minutesIntervals: number[]
) => {
  const timeRangeOptions = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    minutesIntervals.forEach((minutes) => {
      if (!(hour == startHour && minutes < startMinutes) && !(hour == endHour && minutes > endMinutes)) {
        timeRangeOptions.push(getSpecificTime(hour, minutes));
      }
    });
  }
  return timeRangeOptions;
};

export const timeStringToFloat = (textTime: string): number => {
  const hoursMinutes = textTime.split(/[.:]/);
  const hours = parseInt(hoursMinutes[0], 10);
  const minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1], 10) : 0;
  return hours + minutes / 60;
};

export const timeFloatToString = (decimalTime: number): string => {
  const hours = Math.floor(decimalTime).toString();
  const minutes = Math.round((decimalTime % 1) * 60).toString();
  return `${padStart(hours, 2, '0')}:${padStart(minutes, 2, '0')}`;
};

export const minutesToDecimalHour = (minutes: number): number => minutes / 60;
