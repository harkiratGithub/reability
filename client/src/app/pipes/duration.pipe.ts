import { Pipe, PipeTransform } from '@angular/core';
import { padStart } from 'lodash';

@Pipe({
  name: 'durationpipe'
})
export class DurationPipe implements PipeTransform {
  transform(totalSeconds: number): string {
    const hours   = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor(totalSeconds / 60) % 60
    const seconds = totalSeconds % 60

    return [hours,minutes,seconds]
        .map(v => padStart(v.toString(),2,'0'))
        .filter((v,i) => v !== "00" || i > 0)
        .join(":")   
  }
}
