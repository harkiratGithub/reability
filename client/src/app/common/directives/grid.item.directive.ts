import { Directive, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import _ from 'lodash';
import { TechIssueValues } from '../../../constants';

import { IAssignment, IPatientBooking, ITherapistBooking } from 'src/types';

export interface IPosition {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol?: number;
}

@Directive({
  selector: '[css-grid-item]',
})
export class GridItemDirective implements OnChanges, OnDestroy {
  constructor(private el: ElementRef) {}

  @Input() position: IPosition;
  @Input() patientBooking?: IPatientBooking;
  @Input() therapistBooking?: ITherapistBooking;
  @Output() gridItemClick?: EventEmitter<any> = new EventEmitter();

  @HostListener('click') onClick() {
    if (this.therapistBooking) {
      this.gridItemClick.emit(this.therapistBooking.assignments);
    }
    if (this.patientBooking) {
      this.gridItemClick.emit({ patientBooking: this.patientBooking, elementRef: this.el });
    }
  }

  public ngOnChanges() {
    const nativeElement = this.el.nativeElement;
    this.clearElement(nativeElement);

    if (this.position) {
      const area = `${this.position.startRow || 'auto'}/${this.position.startCol || 'auto'}/${
        this.position.endRow || 'auto'
      }/${this.position.endCol || 'auto'}`;
      nativeElement.style.setProperty('grid-area', area);
    }

    if (this.therapistBooking) {
      nativeElement.innerHTML =
        this.therapistBooking.time === this.therapistBooking.originalTime
          ? getPatientNames(this.therapistBooking.assignments)
          : '';
      return;
    }

    if (this.patientBooking) {
      nativeElement.innerHTML =
        this.patientBooking.time === this.patientBooking.originalTime
          ? getPatientBookingDetails(this.patientBooking)
          : '';
    }
  }

  public ngOnDestroy() {
    this.clearElement(this.el.nativeElement);
  }

  private clearElement(el) {
    el.style.removeProperty('grid-area');
    el.innerHTML = '';
  }
}
const getPatientNames = (assignments: IAssignment[]): string =>
  _.reduce(
    assignments,
    (result, assignment, indx) => {
      return `${result}${indx > 0 ? ', ' : ''}${assignment.techIssue === TechIssueValues.blocking ? '!!' : ''}${
        assignment.patientName
      }`;
    },
    ''
  );

const getPatientBookingDetails = (patientBooking: IPatientBooking): string =>
  `${patientBooking.expertiseName} with ${patientBooking.therapistName}`;
