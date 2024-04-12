import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'camelcasepipe',
})
export class CamelCasePipe implements PipeTransform {
  transform(text: string): string {
    const result = text.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}
