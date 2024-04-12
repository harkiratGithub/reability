import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({
  name: 'datepipe',
})
export class DatePipe implements PipeTransform {
  transform(date: Date | string, day: number, format: string = 'yyyy-MM-dd'): string {
    if (!date) {
      return 'Never';
    }
    const localTime = moment.parseZone(date).local()['_d'];
    const newDate = moment(localTime);
    return moment(newDate.format('YYYY-MM-DD HH:mm:ss')).fromNow();
  }
}
