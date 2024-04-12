import { Component, OnInit, OnDestroy, Input, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

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
  @Input() additionalFilters: IBackOfficeTabFilter[];
  @Input() sharedFilters: IBackOfficeTabFilter[];
  @Input() filterBy: string = '';
  @Output() filterTextChanged = new EventEmitter<string>();

  keyUp = new Subject<KeyboardEvent>();
  subscription: Subscription = new Subscription();

  constructor() {}

  ngOnInit() {
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

  ngAfterViewInit() {
    this.filterFunc(this.data, this.filterBy);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  multiSelectSubmit(selectedOptions: IMultiSelectOptions[], filter: IBackOfficeTabFilter) {
    filter.setSelectedOptions(selectedOptions, this.data);
  }
}
