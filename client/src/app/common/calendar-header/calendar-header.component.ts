import { Component, Input, Output, EventEmitter } from '@angular/core';
import { WeekChange } from 'src/constants';

@Component({
  selector: 'app-calendar-header',
  templateUrl: './calendar-header.component.html',
  styleUrls: ['./calendar-header.component.scss'],
})
export class CalendarHeaderComponent {
  @Input() loggedInUsername: string;
  @Input() phone: string = '';
  @Input() dateToDisplay: string;
  @Input() showExportButton: boolean;
  @Input() showBack = false;
  @Input() allowWeekChange = true;
  @Input() showViewOptions = false;
  @Input() isUniqueWeek = false;
  @Output() weekChangeEvent = new EventEmitter<number>();
  @Output() goBack = new EventEmitter<void>();
  @Output() exportToExcel = new EventEmitter<void>();
  @Output() toggleMenu? = new EventEmitter<void>();
  @Output() showListView = new EventEmitter<boolean>();

  isToggleUsed = false;
  isListView = true;

  ngOnInit() {
    this.isToggleUsed = this.toggleMenu.observers.length > 0;
  }

  setNextWeek = () => this.weekChangeEvent.emit(WeekChange.Forward);
  setPreviousWeek = () => this.weekChangeEvent.emit(WeekChange.Backward);
  setCurrentWeek = () => this.weekChangeEvent.emit(WeekChange.Current);
  backClicked = () => this.goBack.emit();
  toggleMenuClick = () => this.toggleMenu.emit();
  setListView = (isListView: boolean) => {
    this.isListView = isListView;
    this.showListView.emit(this.isListView);
  };

  exportCalendarToExcel = () => {
    this.exportToExcel.emit();
  };
}
