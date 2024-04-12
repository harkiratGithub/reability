import { forEach, reduce, find, sortBy, map, sumBy, isNil } from 'lodash';
import moment from 'moment';

import {
  IOffering,
  ITherapistBooking,
  IDailyBookingViewData,
  ITreatmentListItem,
  ISlot,
  ITherapistAvailabilityFromServer,
  IOfferingAvailability,
  ITherapistBookingViewData,
  IBackOfficeInternalViewAction,
} from '../../../types';
import { TechIssueValues } from '../../../constants';
import _ from 'lodash';
import { InnerViewActions } from '../../backoffice/backoffice-constants';
import { AjaxService } from '../../therapist/services/ajax.service';
import { AjaxAdmin } from '../services/ajax_admin.service';

export const getFormattedTherapistBookingForCalendar = (bookingDataFromServer: any[]): ITherapistBooking[] => {
  if (!bookingDataFromServer) {
    return;
  }

  const therapistBookingSeparatedToSlots: ITherapistBooking[] = reduce(
    bookingDataFromServer,
    (booking, value) => {
      let currentBookingSlots = [];
      for (let i = value.time; i < value.time + value.duration / 60; i += 0.25) {
        currentBookingSlots = [...currentBookingSlots, getTherapistFormattedBooking(value, i)];
      }
      return [...booking, ...currentBookingSlots];
    },
    []
  );

  const unitedSlots: ITherapistBooking[] = [];
  forEach(therapistBookingSeparatedToSlots, (booking) => {
    const { day, time, expertiseId } = booking;
    const slot = find(unitedSlots, { day, time, expertiseId });
    if (slot) {
      slot.assignments.push(booking.assignments[0]);
    } else {
      unitedSlots.push(booking);
    }
  });

  return unitedSlots;
};

const getTherapistFormattedBooking = (therapistBookingFromServer: any, slotTime: number): ITherapistBooking => {
  const weekdays = moment.weekdays();
  const {
    expertise_max_patients,
    patient_treatment_max_patients,
    week_day,
    patient_first_name,
    patient_last_name,
    phone,
    expertise_id,
    name,
    time,
    patient_id,
    tech_issue,
    tech_reason,
    patient_treatment_id,
  } = therapistBookingFromServer;
  return {
    availability: true,
    maxPatients: Math.min(+expertise_max_patients, +patient_treatment_max_patients),
    day: weekdays.indexOf(week_day),
    time: slotTime,
    expertiseId: expertise_id,
    expertiseName: name,
    originalTime: time,
    assignments: [
      {
        patientId: patient_id,
        patientName: `${patient_first_name} ${patient_last_name}`,
        phone,
        email: '',
        sessionType: '',
        careGiverName: '',
        careGiverPhone: '',
        techIssue: tech_issue,
        techReason: tech_reason,
        patientTreatmentId: patient_treatment_id,
        day: week_day,
        time,
      },
    ],
  };
};

export const getBookingDataByDays = (offering: IOffering): IDailyBookingViewData[] => {
  if (!offering) {
    return [];
  }

  const { therapistId, therapistName } = offering;

  const dataByDays: IDailyBookingViewData[] = [];

  forEach(offering.offeringAvailability, (availability) => {
    const dayData = find(dataByDays, { day: availability.day });
    if (!dayData) {
      dataByDays.push({
        therapistId,
        therapistName,
        day: availability.day,
        offeringAvailability: availability.slots,
        therapistsBooking: [],
      });
    } else {
      dayData.offeringAvailability = availability.slots;
    }
  });

  forEach(offering.therapistBooking, (booking) => {
    const dayData = find(dataByDays, { day: booking.day });
    if (!dayData) {
      dataByDays.push({
        therapistId,
        therapistName,
        day: booking.day,
        offeringAvailability: [],
        therapistsBooking: [booking],
      });
    } else {
      dayData.therapistsBooking.push(booking);
    }
  });

  return sortBy(dataByDays, ['day']);
};

export const getFormattedTherapistsBooking = (therapistBookingFromServer: any): ITreatmentListItem[] => {
  const therapistBooking = map(therapistBookingFromServer, (booking) => {
    const {
      week_day: weekDay,
      time,
      patient_treatment_id: treatmentId,
      name: treatmentName,
      duration,
      therapist_id: therapistId,
      therapist_first_name: therapistFirstName,
      therapist_last_name: therapistLastName,
      patient_first_name: patientFirstName,
      patient_last_name: patientLastName,
      phone,
      patient_id: patientId,
      tech_issue: patientTechIssue,
      tech_reason: patientTechReason,
      expertise_max_patients: maxPatientsExpertise,
      patient_treatment_max_patients: maxPatientsTreatment,
      booking_id: bookingId,
    } = booking;

    const maxPatientsExpertiseForCalculation = maxPatientsExpertise ? maxPatientsExpertise : Number.MAX_SAFE_INTEGER;
    const maxPatientsTreatmentForCalculation = maxPatientsTreatment ? maxPatientsTreatment : Number.MAX_SAFE_INTEGER;

    const therapistName = `${therapistFirstName} ${therapistLastName}`;
    const patientName = `${patientFirstName} ${patientLastName}`;
    const day = moment.weekdays().indexOf(weekDay);
    const maxPatients = Math.min(maxPatientsExpertiseForCalculation, maxPatientsTreatmentForCalculation);
    const isUnsavedItem = false;

    return {
      day,
      time,
      treatmentId,
      treatmentName,
      duration,
      therapistId,
      therapistName,
      patientName,
      phone,
      patientId,
      patientTechIssue,
      patientTechReason,
      maxPatients,
      isUnsavedItem,
      bookingId,
    };
  });

  return sortBy(therapistBooking, ['day', 'time']);
};

export const getTitleByTechIssue = (issue: TechIssueValues) => {
  switch (issue) {
    case TechIssueValues.blocking:
      return 'Major issue';
    case TechIssueValues.nonBlocking:
      return 'Minor issue';
    case TechIssueValues.empty:
      return 'No issue';
  }
};

const getAvailabilityFormattedSlots = (times: number[]): ISlot[] => {
  const timesBySlots = _.chunk(times, 2);
  return map(timesBySlots, (time) => ({
    from: time[0],
    to: time[1],
  }));
};

const getCurrentWeekTherapistAvailabilities = (
  allTherapistAvailabilities: ITherapistAvailabilityFromServer[]
): ITherapistAvailabilityFromServer[] => {
  const currentWeekTherapistAvailabilities: ITherapistAvailabilityFromServer[] = [];

  forEach(allTherapistAvailabilities, (therapistAvailability) => {
    const existingTherapistRecordIndex = _.findIndex(currentWeekTherapistAvailabilities, {
      therapist_id: therapistAvailability.therapist_id,
    });

    if (existingTherapistRecordIndex === -1) {
      currentWeekTherapistAvailabilities.push(therapistAvailability);
    } else if (!therapistAvailability.is_default_availability) {
      currentWeekTherapistAvailabilities[existingTherapistRecordIndex] = therapistAvailability;
    }
  });
  return currentWeekTherapistAvailabilities;
};

export const getFormattedOfferings = (therapistAvailabilities: any, therapistsBookingFromServer: any): IOffering[] => {
  const weekdays = moment.weekdays();
  const currentWeekTherapistsAvailabilities = getCurrentWeekTherapistAvailabilities(therapistAvailabilities);

  const formattedDataAvailabilities = map(currentWeekTherapistsAvailabilities, (therapistAvailability) => {
    const {
      availability,
      therapist_id: therapistId,
      therapist_first_name: firstName,
      therapist_last_name: lastName,
      is_default_availability: isDefaultAvailability,
    } = therapistAvailability;

    let offeringAvailability: IOfferingAvailability[] = [];
    _.forIn(availability, (value, key) => {
      offeringAvailability.push({
        day: weekdays.indexOf(key),
        totalBusyHours: 0,
        slots: getAvailabilityFormattedSlots(value),
      });
    });

    offeringAvailability = _.chain(offeringAvailability)
      .filter((day) => day.slots.length > 0)
      .sortBy('day')
      .value();

    const therapistBooking = getFormattedTherapistsBooking(therapistsBookingFromServer[therapistId]);

    return {
      therapistId,
      therapistName: `${firstName} ${lastName}`,
      isUniqueWeek: !isDefaultAvailability,
      offeringAvailability,
      therapistBooking,
    };
  });
  return formattedDataAvailabilities;
};

const sortPairs = (a: number[], b: number[]): number => a[0] - b[0] || a[1] - b[1];

export const sortAndMergeOverlaps = (array: number[]): number[] => {
  let last: number[];
  const sortedPairArrays = _.chunk(array, 2).sort(sortPairs);

  const result = _.reduce(
    sortedPairArrays,
    (res, pair) => {
      if (!last || pair[0] > last[1]) {
        last = pair;
        return [...res, last];
      } else if (pair[1] > last[1]) {
        last[1] = pair[1];
      }
      return res;
    },
    []
  );
  return _.flatten(result);
};

export const getTimeBetween = (startTime: number, endTime: number, decimalJump: number) => {
  let arr = [];
  while (startTime < endTime) {
    arr = [...arr, startTime];
    startTime += decimalJump;
  }
  return arr;
};

export const getAllProfessionsBookingsNumber = (allTherapistsBookingData: ITherapistBookingViewData[]): number => {
  let allBookingsCounter = 0;
  forEach(allTherapistsBookingData, (bookingData) => {
    const { dailyBookingViewData } = bookingData || {};
    if (!dailyBookingViewData) {
      return;
    }
    allBookingsCounter += sumBy(dailyBookingViewData, (data) => data.therapistsBooking.length);
  });
  return allBookingsCounter;
};

export const deleteOrReplaceBooking = (
  action: IBackOfficeInternalViewAction,
  ajax: AjaxService | AjaxAdmin
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!action || isNil(action.data) || !action.actionType) {
      return reject('missing data');
    }
    const { bookingId, time, day } = action.data as Partial<ITreatmentListItem>;
    if (!bookingId) {
      return reject('no bookingId');
    }
    if (action.actionType === InnerViewActions.DeleteBookingSession) {
      ajax.deleteBookingById(bookingId).subscribe(() => {
        return resolve();
      });
    }
    if (action.actionType === InnerViewActions.ModifyBookingSession && !isNil(time) && !isNil(day)) {
      ajax.editBookingById({ bookingId, time, day }).subscribe(() => {
        return resolve();
      });
    }
  });
};
