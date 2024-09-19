import { Moment } from 'moment';
import { Subject } from 'rxjs';

import { InnerViewActions, BookingDeleteOptions } from './app/backoffice/backoffice-constants';
import { DayText, TechIssueValues, DailyBookingViewActionType, SuspendValues, ScoreType } from './constants';

export interface IScore {
  type: ScoreType;
  value: any;
}
export interface IBackOfficeTabAction {
  text: string;
  image: string;
  enabled: boolean;
  action: (row: any) => void;
}

export interface IBackOfficeTabFilter {
  displayText: string;
  amount?: number;
  isActive: boolean;
  allOptions?: IMultiSelectOptions[];
  selectedOptions?: IMultiSelectOptions[];
  isOneAtTime?: boolean;
  isSingleSelect?: boolean;
  filter: (data: []) => void;
  setSelectedOptions?: (options: IMultiSelectOptions[], data: []) => void;
}

export interface IMultiSelectOptions {
  value: any;
  displayName: string;
}
export interface IBackOfficeInternalViewAction {
  actionType: InnerViewActions;
  id?: number;
  data?: any;
}
export interface IDropDownItem {
  id: number | string;
  name: number | string;
}

export interface IWeek {
  weekNumber: number;
  year: number;
}
export interface ISlot {
  from: number;
  to: number;
}

export interface IDailySlots {
  day: number;
  slots: ISlot[];
}

export interface ITreatmentAvailability {
  expertiseId: number;
  therapistId: number;
  days: IDailySlots[];
}

export interface IPatientTreatment {
  patientId: number;
  expertiseId: number;
  patientTreatmentId: number;
  expertiseName: string;
  timesPerWeek: number;
  booked: number;
  duration: number;
  maxPatientsTreatment: number;
  maxPatientsExpertise: number;
}

export interface IPatientTreatmentSlot {
  patientId: number;
  therapistId: number;
  expertiseId: number;
  therapistName: string;
  expertiseName: string;
  duration: number;
  day: number;
  time: number;
}

export interface ITreatmentListItem {
  day: number;
  time: number;
  treatmentId: number;
  treatmentName: string;
  duration: number;
  therapistId: number;
  therapistName: string;
  patientName: string;
  phone: string;
  patientId?: number;
  patientTechIssue?: TechIssueValues;
  patientTechReason?: string;
  maxPatients: number;
  isUnsavedItem: boolean;
  bookingId?: number;
}

export interface IOfferingAvailability {
  day: number;
  totalBusyHours: number;
  slots: ISlot[];
}

export interface IOffering {
  therapistId: number;
  therapistName: string;
  isUniqueWeek?: boolean;
  offeringAvailability: IOfferingAvailability[];
  therapistBooking: ITreatmentListItem[];
}

export interface IBookingViewShownParams {
  currentDate: Moment;
  expertiseId: number;
  patientId: number;
}

export interface ICalendarAssignment {
  patientName?: string;
  phone?: number;
  email?: string;
  sessionType?: any;
  careGiverName?: string;
  careGiverPhone?: number;
}
export interface IBookingAssignment {
  patientTreatmentId: number;
  therapistId: number;
  date: string;
  time: number;
  timesToRepeat: number;
  expertiseId: number;
  patientId: number;
}
export interface ITherapistAvailability {
  userId?: number;
  week?: number;
  year?: number;
  availability?: Record<DayText, number[]>;
}

export interface ITherapistBooking {
  availability: boolean;
  maxPatients: number;
  day: number;
  time: number;
  expertiseId: number;
  expertiseName: number;
  originalTime: number;
  assignments: IAssignment[];
}

export interface IAssignment {
  patientId: number;
  patientName: string;
  phone: string;
  email: string;
  sessionType: any;
  careGiverName: string;
  careGiverPhone: string;
  selected?: boolean;
  techIssue: TechIssueValues;
  techReason: string;
  patientTreatmentId: number;
  day: number;
  time: number;
}

export interface IBooking {
  availability: boolean;
  day: number;
  time: number;
  originalTime: number;
}

export interface IPatientBooking extends IBooking {
  expertiseName: string;
  therapistName: string;
  patientTreatmentId: number;
}

export interface IDeleteBookingParams {
  deleteOption: BookingDeleteOptions;
  patientTreatmentId: number;
  year: number;
  day: number;
  week: number;
  time: number;
  originalTime: number;
}
export interface IDailyBookingViewData {
  therapistId: number;
  therapistName: string;
  day: number;
  offeringAvailability: ISlot[];
  therapistsBooking: ITreatmentListItem[];
}

export interface ITherapistBookingViewData {
  therapistId: number;
  therapistName: string;
  isUniqueWeek?: boolean;
  dailyBookingViewData: IDailyBookingViewData[];
}

export interface IDailyBookingViewActionParams {
  action: DailyBookingViewActionType;
  therapistId: number;
  therapistName: string;
  day: number;
  time: number;
}

export interface IPatient {
  id: number;
  firstName?: string;
  lastName?: string;
  identityNumber?: number;
  status?: boolean;
  phone?: number;
  userId?: number;
  suspend?: SuspendValues;
  techIssue?: TechIssueValues;
  techReason?: string;
  hasCamera?: boolean;
  disabledSkeleton?: boolean;
}

export interface ILogValueChange {
  key: string;
  oldValue: any;
  newValue: any;
}

export interface IUserLogEntry {
  userId: number;
  userFullName: string;
  performedByUserId: number;
  performedByName: string;
  logDate: string;
  action: string;
  actionDescription: string;
  valueChanges: ILogValueChange[];
  remarks: string;
  role: string;
  subject: string;
}

export interface ICreateRemarkParams {
  userId: number;
  remarks: string;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface IOrganAngle {
  organName: string;
  angle: number;
  startPointWebCamBufferIndex: number;
  middlePointWebCamBufferIndex: number;
  endPointWebCamBufferIndex: number;
}

export interface ITherapistAvailabilityFromServer {
  availability: Record<DayText, number[]>;
  is_default_availability: boolean;
  therapist_id: number;
  therapist_first_name: string;
  therapist_last_name: string;
}

export interface IUserFilters {
  departments?: IFilterDetails;
  suspend?: IFilterDetails;
  pending?: IFilterDetails;
  techIssue?: IFilterDetails;
}
export interface IFilterDetails {
  isActive: boolean;
  data?: IMultiSelectOptions[];
}

export type NgChanges<Component extends object, Props = ExcludeFunctions<Component>> = {
  [Key in keyof Props]: {
    previousValue: Props[Key];
    currentValue: Props[Key];
    firstChange: boolean;
    isFirstChange(): boolean;
  };
};

type MarkFunctionPropertyNames<Component> = {
  [Key in keyof Component]: Component[Key] extends Function | Subject<any> ? never : Key;
};

type ExcludeFunctionPropertyNames<T extends object> = MarkFunctionPropertyNames<T>[keyof T];

type ExcludeFunctions<T extends object> = Pick<T, ExcludeFunctionPropertyNames<T>>;

export interface IGame {
  id: number;
  name: string;
  url: string;
  bodyTrackRequired: boolean;
  position: number;
  description: string;
}

export interface IGameData {
  gameId: number;
  worksheet: string;
  tags: any;
  data: object;
  active: boolean;
  target_answer: any;
}

export interface FeedbackOption {
  value: string;
  label: string;
}

export interface FeedbackQuestion {
  id: number;
  question: string;
  type: 'checkbox' | 'text' | 'radio';
  options?: FeedbackOption[];
}

export interface IPatientLog {
  gameName?: string;
  duration?: string;
  gameSummary?: any;
}
