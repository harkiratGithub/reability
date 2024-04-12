import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({
  name: 'day',
})
export class DayPipe implements PipeTransform {
  transform(day: number, shortFormat = false): string {
    if (shortFormat){
      return moment.weekdaysShort(day).toUpperCase();
    }
    return moment.weekdays(day);
  }
}
