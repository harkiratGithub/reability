import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  AfterViewInit,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import * as consts from '../backoffice-constants';
import { MatDatepicker } from '@angular/material/datepicker';
import { IBackOfficeTabFilter, IMultiSelectOptions } from '../../../types';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import _moment, { Moment } from 'moment';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

const moment = _moment;

export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YYYY',
  },
  display: {
    dateInput: 'MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@Component({
  selector: 'app-backoffice-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  providers: [
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  ],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() data: [];
  @Input() filterFunc;
  @Input() disabled: boolean;
  @Input() currentTabIndex: string = '';
  @Input() additionalFilters: IBackOfficeTabFilter[];
  @Input() sharedFilters: IBackOfficeTabFilter[];
  @Input() filterBy: string = '';
  @Output() filterTextChanged = new EventEmitter<string>();
  @Output() monthChanged = new EventEmitter<{ month: string; year: string }>();
  @Output() sendmonthChanged = new EventEmitter<{ month: string; year: string }>();
  //monthControl = new FormControl(moment().toISOString(), [Validators.required, this.monthValidator]);
  monthControl = new FormControl(moment(), [Validators.required, this.monthValidator]); // Use Moment type directly

  keyUp = new Subject<KeyboardEvent>();
  subscription: Subscription = new Subscription();
  minDate: Moment;
  maxDate: Moment;

  constructor() {}

  ngOnInit() {
    if (this.rtmTab == this.currentTabIndex) {
      const today = moment();
      this.minDate = moment().startOf('year');
      this.maxDate = moment().endOf('month');
      this.monthControl.setValue(today);
      this.emitMonth(today);
      this.subscription.add(this.monthControl.valueChanges.subscribe((newMonth) => this.emitMonth(newMonth)));
    } else {
      this.subscription.add(
        this.keyUp
          .pipe(
            // tslint:disable-next-line:no-string-literal
            map((event) => event.target['value']),
            debounceTime(50),
            distinctUntilChanged()
          )
          .subscribe((text) => {
            this.filterBy = text;
            this.filterTextChanged.emit(text);
            this.filterFunc(this.data, text);
          })
      );
    }
  }

  emitMonth(selectedMonth: moment.Moment = this.monthControl.value) {
    if (selectedMonth) {
      const month: string = selectedMonth.format('MM');
      const year: string = selectedMonth.format('YYYY');
      this.monthChanged.emit({ month, year });
      this.sendmonthChanged.emit({ month, year });
    }
  }

  monthValidator(control: FormControl) {
    const value = control.value;
    if (!value || !moment(value, 'MM/YYYY', true).isValid()) {
      return { invalidMonth: true };
    }
    return null;
  }

  setMonthAndYear(normalizedMonthAndYear: Moment, datepicker: MatDatepicker<Moment>) {
    const ctrlValue = this.monthControl.value ?? moment();
    ctrlValue.month(normalizedMonthAndYear.month());
    ctrlValue.year(normalizedMonthAndYear.year());
    this.monthControl.setValue(ctrlValue, { emitEvent: true });
    console.log('ctrlValue', ctrlValue, this.monthControl.value);
    datepicker.close();
  }

  
  ngAfterViewInit() {
    this.filterFunc(this.data, this.filterBy);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  multiSelectSubmit(selectedOptions: IMultiSelectOptions[], filter: IBackOfficeTabFilter) {
    filter.setSelectedOptions(selectedOptions, this.data);
  }

  get rtmTab(): any {
    return consts.Tabs.rtm;
  }
}
