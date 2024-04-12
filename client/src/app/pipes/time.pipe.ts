import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';
import { padStart } from 'lodash';
@Pipe({
  name: 'time',
})
export class TimePipe implements PipeTransform {
  transform(time: number, duration = 0): string {
    const timeString = this.getTimeString(time);
    return moment('2020-01-01 ' + timeString)
      .add(duration, 'minutes')
      .format('HH:mm');
  }

  getTimeString(time: number): string {
    const hours = Math.floor(time);
    const minutes = (time - Math.floor(time)) * 60;
    return [hours, minutes]
      .map((v) => padStart(v.toString(), 2, '0'))
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  }
}
