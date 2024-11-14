import { Component, OnInit, OnDestroy, Input, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import * as consts from '../backoffice-constants';

import { IBackOfficeTabFilter, IMultiSelectOptions } from '../../../types';
@Component({
  selector: 'app-backoffice-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
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
  @Output() dateRangeChanged = new EventEmitter<{ startDate: string; endDate: string }>();
  dateRangeForm: FormGroup;
  keyUp = new Subject<KeyboardEvent>();
  subscription: Subscription = new Subscription();

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.dateRangeForm = this.fb.group(
      {
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
      },
      { validators: this.dateRangeValidator }
    );

    this.subscription.add(
      this.dateRangeForm.valueChanges.subscribe((value) => {
        console.log('selected date: ', value);
        if (this.dateRangeForm.valid) {
          // const startDate = value.startDate ? new Date(value.startDate).toISOString().split('T')[0] : null;
          // const endDate = value.endDate ? new Date(value.endDate).toISOString().split('T')[0] : null;
          const startDate = value.startDate ? new Date(value.startDate).toISOString().split('T')[0] + 'T00:00:00.000Z' : null;
          const endDate = value.endDate ? new Date(value.endDate).toISOString().split('T')[0] + 'T00:00:00.000Z' : null;
          this.updateAPIWithDateRange(startDate, endDate);
          this.dateRangeChanged.emit({ startDate, endDate });
        }
      })
    );

    this.subscription.add(
      this.keyUp
        .pipe(
          // tslint:disable-next-line:no-string-literal
          map((event) => event.target['value']),
          debounceTime(50),
          distinctUntilChanged()
        )
        .subscribe((text) => {                                                                
          console.log('subscribe', text);
          this.filterBy = text;
          this.filterTextChanged.emit(text);
          this.filterFunc(this.data, text);
          console.log(
            'lala',
            (this.filterBy = text),
          );
        })
    );
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

  dateRangeValidator(form: FormGroup) {
    const start = form.get('startDate')?.value;
    const end = form.get('endDate')?.value;
    if (!start || !end) {
      return { required: true };
    }

    if (start && end && new Date(start) > new Date(end)) {
      return { invalidDateRange: true };
    }

    return null;
  }

  get rtmTab(): any {
    return consts.Tabs.rtm;
  }

  clearDateRange() {
    this.dateRangeForm.get('startDate')?.setValue(null);
    this.dateRangeForm.get('endDate')?.setValue(null);
  }

  updateAPIWithDateRange(startDate: string, endDate: string) {
    console.log('Selected Date Range:', { startDate, endDate });
  }
}
