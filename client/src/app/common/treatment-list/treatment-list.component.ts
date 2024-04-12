import { Component, Input, EventEmitter, Output, ViewChild, ViewChildren, QueryList } from '@angular/core';
import moment, { Moment } from 'moment';
import { difference, filter, find, map, reduce, sortBy, sumBy } from 'lodash';

import {
  IBackOfficeInternalViewAction,
  IDailyBookingViewActionParams,
  IDailyBookingViewData,
  ISlot,
  ITherapistBookingViewData,
  ITreatmentListItem,
  NgChanges,
} from '../../../types';
import {
  BookingSubscriptionStatus,
  DailyBookingViewActionType,
  TechIssueValues,
  START_OF_DAY,
  WEEK_DAYS,
  HOUR_SPLIT,
  DayText,
} from '../../../constants';
import { minutesToDecimalHour, timeFloatToString, timeStringToFloat } from '../date-util';
import { IMenuOption } from '../side-menu/side-menu.component';
import { getTimeBetween } from '../helpers/booking-utils';
import { FromToSelectComponent } from '../from-to-select/from-to-select.component';
import { focusOnMatMenuItem } from '../../backoffice/backoffice-util';
import { InnerViewActions } from '../../backoffice/backoffice-constants';

enum SlotType {
  availability = 'availability',
  booking = 'booking',
}
@Component({
  selector: 'app-treatment-list',
  templateUrl: './treatment-list.component.html',
  styleUrls: ['./treatment-list.component.scss'],
})
export class TreatmentListComponent {
  @Input() therapistBookingViewData: ITherapistBookingViewData;
  @Input() currentDate: Moment;
  @Input() availabilityClickActionType: DailyBookingViewActionType;
  @Input() bookingClickActionType: DailyBookingViewActionType;
  @Input() bookingTimeClickActionType: DailyBookingViewActionType;
  @Input() viewOnly = false;
  @Input() isFormerDates: boolean;
  @Output() actionSubmit = new EventEmitter<IDailyBookingViewActionParams>();
  @Output() deleteOrReplaceBooking = new EventEmitter<IBackOfficeInternalViewAction>();
  @ViewChild('modifySessionSelect') sessionSelect: FromToSelectComponent;
  @ViewChildren('daySelectItems')
  daySelectItems: QueryList<any>;
  showDaysMenu = false;
  showModifySessionModal = false;
  allSlots;
  slotType = SlotType;
  possibleWeekDays = map(DayText).slice(0, WEEK_DAYS);
  pickedBookingDay: string;
  bookingStartTime: string;
  bookingEndTime: string;
  pickedBookingItem: ITreatmentListItem;
  sessionDuration: number = 45;

  ngOnChanges(changes: NgChanges<TreatmentListComponent>) {
    if (changes.therapistBookingViewData?.previousValue !== changes.therapistBookingViewData?.currentValue) {
      this.refreshAvailability();
    }
  }
  getDayDate = (day: number): string => {
    return this.currentDate.day(day).format('DD');
  };
  refreshAvailability() {
    this.allSlots = this.getSlotsFromDailyBookingViewData(this.therapistBookingViewData.dailyBookingViewData);
  }
  isBookingInsideAvailability = (booking: ITreatmentListItem, slots: ISlot[]): boolean => {
    const result = find(slots, (slot: ISlot) => {
      const [startTime, endTime] = [booking.time, minutesToDecimalHour(booking.duration) + booking.time];
      return slot.from <= startTime && slot.to >= endTime;
    });
    return Boolean(result);
  };
  onActionSubmit = (action: DailyBookingViewActionType, day: number, time: number): void => {
    if (this.viewOnly) {
      return;
    }
    const { therapistId, therapistName } = this.therapistBookingViewData;

    this.showDaysMenu = false;
    this.actionSubmit.emit({
      therapistId,
      therapistName,
      action,
      day,
      time,
    });
  };
  getSubscriptionClass = (booking: ITreatmentListItem, dayBookings: ITreatmentListItem[]): string => {
    const { maxPatients } = booking;
    const [startTime, endTime] = [booking.time, minutesToDecimalHour(booking.duration) + booking.time];
    const patientsAmount = filter(dayBookings, (item) => {
      const [itemStartTime, itemEndTime] = [item.time, minutesToDecimalHour(item.duration) + item.time];
      const startOverlap = itemStartTime <= startTime && itemEndTime > startTime;
      const endOverlap = itemStartTime < endTime && itemEndTime >= endTime;
      const insideOverlap = itemStartTime >= startTime && itemEndTime <= endTime;
      const outsideOverlap = itemStartTime <= startTime && itemEndTime >= endTime;
      return startOverlap || endOverlap || insideOverlap || outsideOverlap;
    }).length;

    if (patientsAmount < maxPatients) {
      return BookingSubscriptionStatus.Under;
    }
    if (patientsAmount > maxPatients) {
      return BookingSubscriptionStatus.Over;
    }
    return BookingSubscriptionStatus.Exact;
  };

  isTechIssueBlocking = (techIssue: TechIssueValues): boolean => {
    return techIssue === TechIssueValues.blocking;
  };

  toggleDaysMenu = () => {
    this.showDaysMenu = !this.showDaysMenu;
  };
  getAddButtonMenuOptions = (): IMenuOption[] => {
    const { therapistId, therapistName } = this.therapistBookingViewData;
    return map(moment.weekdays().slice(0, WEEK_DAYS), (weekday) => ({
      title: weekday,
      callback: () => {
        this.showDaysMenu = false;
        this.actionSubmit.emit({
          therapistId,
          therapistName,
          action: DailyBookingViewActionType.CreateBooking,
          day: moment.weekdays().indexOf(weekday),
          time: START_OF_DAY,
        });
      },
    }));
  };
  getSlotsFromDailyBookingViewData = (dailyBookingViewData: IDailyBookingViewData[]) =>
    map(dailyBookingViewData, ({ offeringAvailability, therapistsBooking }) => {
      const availableArray: number[] = this.getAvailabilityBookingIntersection(offeringAvailability, therapistsBooking);
      const availabilityObjects: any[] = reduce(
        availableArray,
        (result, curr, index) => {
          if (index % 2 !== 0) {
            return result;
          }
          return [
            ...result,
            {
              time: curr,
              duration: (availableArray[index + 1] - curr) * 60,
              type: SlotType.availability,
            },
          ];
        },
        []
      );

      if (therapistsBooking.length < 1) {
        return availabilityObjects;
      }
      const temp = [...availabilityObjects, ...therapistsBooking];
      const sortedTemp = sortBy(temp, [(o) => o.time]);

      return sortedTemp;
    });

  getOnlyTimeEdges = (timesArray: number[], decimalJump: number) => {
    return reduce(
      timesArray,
      (result, curr, index) => {
        // first spot
        if (index === 0) {
          if (!timesArray[index + 1] || curr + decimalJump !== timesArray[index + 1]) {
            return [curr, curr + decimalJump];
          }
          return [curr];
        }
        // last spot
        if (timesArray.length - 1 === index) {
          if (timesArray[index - 1] + decimalJump !== curr) {
            return [...result, curr, curr + decimalJump];
          }
          return [...result, curr + decimalJump];
        }
        // middle lonely spot start and stop
        if (timesArray[index - 1] + decimalJump !== curr && curr + decimalJump !== timesArray[index + 1]) {
          return [...result, curr, curr + decimalJump];
        }
        // middle stop
        if (timesArray[index + 1] !== curr + decimalJump) {
          return [...result, curr + decimalJump];
        }
        // middle start
        if (timesArray[index - 1] + decimalJump !== curr) {
          return [...result, curr];
        }
        return result;
      },
      []
    );
  };
  getAvailabilityBookingIntersection = (offeringAvailability, therapistsBooking: ITreatmentListItem[]): number[] => {
    const bookingWithStartEndTimes: number[] = reduce(
      therapistsBooking,
      (result, booking) => [...result, booking.time, booking.time + minutesToDecimalHour(booking.duration)],
      []
    );
    const bookingSpan = reduce(
      bookingWithStartEndTimes,
      (result, curr, index) => {
        if (index % 2 !== 0) {
          return result;
        }
        return [
          ...result,
          ...getTimeBetween(bookingWithStartEndTimes[index], bookingWithStartEndTimes[index + 1], 1 / HOUR_SPLIT),
        ];
      },
      []
    );
    const availabilitySpan: number[] = reduce(
      offeringAvailability,
      (result, availability) => [...result, ...getTimeBetween(availability.from, availability.to, 1 / HOUR_SPLIT)],
      []
    );
    const intersectionSpan = difference(availabilitySpan, bookingSpan);
    return this.getOnlyTimeEdges(intersectionSpan, 1 / HOUR_SPLIT);
  };

  getTherapistId() {
    return this.therapistBookingViewData.therapistId;
  }

  getTherapistDailyBookingNumber() {
    return sumBy(this.therapistBookingViewData.dailyBookingViewData, (data) => data.therapistsBooking.length);
  }

  calcTherapistSlotsByMinutes() {
    return (
      sumBy(this.therapistBookingViewData.dailyBookingViewData, (data) => data.offeringAvailability.length) *
      this.sessionDuration
    );
  }
  closeModifySessionModal(): void {
    this.showModifySessionModal = false;
  }
  openModifySessionModal(action: DailyBookingViewActionType, slot): void {
    if (action === DailyBookingViewActionType.ModifySession) {
      this.setBookingDayAndHoursFromSlot(slot);
      this.showModifySessionModal = true;
    }
  }

  isModifySessionModalOpen(): boolean {
    return this.showModifySessionModal;
  }
  focusOnDayMenuItem(time: string) {
    focusOnMatMenuItem(time, this.daySelectItems);
  }
  setBookingDayAndHoursFromSlot(bookingItem: ITreatmentListItem) {
    const { time, duration, day } = bookingItem;
    this.pickedBookingDay = this.possibleWeekDays[day];
    this.bookingStartTime = timeFloatToString(time);
    this.bookingEndTime = timeFloatToString(time + duration / 60);
    this.pickedBookingItem = { ...bookingItem };
  }
  setBookingDayFromSelect(day: string) {
    this.pickedBookingDay = day;
  }
  deletePickedBooking() {
    const { bookingId } = this.pickedBookingItem;
    if (!bookingId) {
      return;
    }
    this.deleteOrReplaceBooking.emit({ actionType: InnerViewActions.DeleteBookingSession, data: { bookingId } });
    this.closeModifySessionModal();
  }

  modifyBooking() {
    const { bookingId } = this.pickedBookingItem;
    const startTime = this.sessionSelect?.getLocalStartTime();
    if (!startTime || !this.pickedBookingDay || !bookingId) {
      return;
    }
    this.deleteOrReplaceBooking.emit({
      actionType: InnerViewActions.ModifyBookingSession,
      data: { bookingId, time: timeStringToFloat(startTime), day: moment().day(this.pickedBookingDay).day() },
    });
    this.closeModifySessionModal();
  }
}
