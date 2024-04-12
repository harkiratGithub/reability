import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import moment, { Moment } from 'moment';
import { map, reduce, flatMap, get, flatten } from 'lodash';
import * as XLSX from 'xlsx';
import {
  IBackOfficeInternalViewAction,
  IOffering,
  ITherapistBookingViewData,
  ITreatmentListItem,
} from '../../../types';
import { DailyBookingViewActionType, WeekChange } from '../../../constants';
import {
  deleteOrReplaceBooking,
  getAllProfessionsBookingsNumber,
  getBookingDataByDays,
} from '../../common/helpers/booking-utils';
import { AjaxAdmin } from '../../common/services/ajax_admin.service';

@Component({
  selector: 'app-admin-profession-schedule',
  templateUrl: './admin-profession-schedule.component.html',
  styleUrls: ['./admin-profession-schedule.component.scss'],
})
export class AdminProfessionScheduleComponent implements OnInit {
  @Input() editedEntity;
  @Input() professionName = '';
  @Output() goBack = new EventEmitter<void>();
  @Output() professionWeekChanged = new EventEmitter<Date>();

  currentDate: Moment = moment();
  headerDateString: string;
  isFormerDates = false;
  offerings: IOffering[] = [];
  allTherapistsBookingViewData: ITherapistBookingViewData[];
  headerText = '';
  mappedBookingData = [];
  bookingClickActionType = DailyBookingViewActionType;

  constructor(private http: AjaxAdmin) {}

  ngOnInit(): void {
    this.headerDateFormat();
    this.offerings = this.editedEntity.offerings;
    this.initializeBookingDataByDays();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.editedEntity) {
      this.offerings = this.editedEntity.offerings;
      this.initializeBookingDataByDays();
    }
    this.headerText = `${this.professionName} Schedule (${getAllProfessionsBookingsNumber(
      this.allTherapistsBookingViewData
    )})`;
  }

  initializeBookingDataByDays = (): void => {
    this.allTherapistsBookingViewData = map(this.offerings, (offering) => {
      const { therapistId, therapistName } = offering;
      return {
        therapistId,
        therapistName,
        dailyBookingViewData: getBookingDataByDays(offering),
      };
    });
    const dailyBookingData = reduce(
      this.allTherapistsBookingViewData,
      (acc, item) => {
        if (item.dailyBookingViewData.length) {
          return [...acc, item.dailyBookingViewData];
        }
        return acc;
      },
      []
    );
    const bookingData = flatMap(dailyBookingData, (innerArray) => {
      return reduce(
        innerArray,
        (acc, obj) => {
          const therapistsBooking = get(obj, 'therapistsBooking', []);
          if (therapistsBooking.length > 0) {
            return [...acc, therapistsBooking];
          }
          return acc;
        },
        []
      );
    });
    const flattenBookingData = flatten(bookingData);
    this.mappedBookingData = map(flattenBookingData, (item) => {
      return { therapistName: item.therapistName, patientName: item.patientName, treatmentName: item.treatmentName };
    });
  };

  backClicked = (): void => {
    this.goBack.emit();
  };

  hasOfferings = (): boolean => this.offerings?.length > 0;

  headerDateFormat() {
    const firstDayOfWeek = this.currentDate.day(0).format('MMMM DD');
    const lastDayOfWeek = this.currentDate.day(6).format('MMMM DD, YYYY');
    this.headerDateString = `${firstDayOfWeek} - ${lastDayOfWeek}`;
  }

  weekChange(weekChangeId: number) {
    this.currentDate =
      weekChangeId > 0
        ? moment(this.currentDate)
            .weekday(0)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .subtract(1, 'weeks')
        : moment(this.currentDate).weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).add(1, 'weeks');
    this.isFormerDates = this.currentDate < moment().weekday(0).set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
    this.headerDateFormat();
    this.professionWeekChanged.emit(this.currentDate.toDate());
  }
  handleDeleteOrReplaceBooking = (action: IBackOfficeInternalViewAction) => {
    deleteOrReplaceBooking(action, this.http)
      .then(() => this.professionWeekChanged.emit(this.currentDate.toDate()))
      .catch((err) => console.log(err));
  };

  exportCalendarToExcel() {
    const fileName = this.professionName + ' ' + this.currentDate.day(0).format('MM-DD-YYYY');
    const ws = XLSX.utils.json_to_sheet(this.mappedBookingData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, fileName);
    XLSX.writeFile(wb, fileName + '.xlsx');
  }
}
