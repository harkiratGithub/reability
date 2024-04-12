import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  name: 'minutesToDuration',
})
export class MinutesToDuration implements PipeTransform {
  transform(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (!hours) {
      return `${remainingMinutes}m`;
    } else if (!remainingMinutes) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }
}
