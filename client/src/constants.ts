export const displayConstanst = {
  no_session_place_holder_text: {
    title: 'No patient selected',
    subtitle: 'Please choose one to create a session',
  },
  no_response_from: 'NO RESPONSE FROM',
};

export enum ScoreType {
  Percentage = 'Percentage',
  Regular = 'Regular',
}

export const PeersStatus = {
  RINGING: 'Ringing',
  CONNECTED: 'Connected',
  AVAILABLE: 'Available',
  LOGGED_OUT: 'Offline',
  BUSY: 'Busy',
  DISABLED: 'Disabled',
};

export enum SuspendValues {
  empty = '<Empty>',
  vacation = 'Vacation',
  loa = 'LOA',
  financial = 'Financial',
  tech = 'Tech',
  concluded = 'Concluded',
}

export enum TechIssueValues {
  empty = '<Empty>',
  nonBlocking = 'Non-blocking',
  blocking = 'Blocking',
}

export enum PayerDropDownValues {
  Empty = '<Empty>',
  Private = 'Private',
  HMO = 'HMO',
  MOD = 'MOD',
  Other = 'Other',
}

export enum PendingValues {
  noPrescription = 'No Prescription',
  noBooking = 'No Booking',
  underBooked = 'Under Booked',
  overBooked = 'Over Booked',
  techSupport = 'Tech Support',
  followups = 'Followups',
  finalSessions = 'Final Sessions',
}

export const TIME_TO_ANSWER_CALL_MS = 15000;

export const VIDEO_PATIENT_MESSAGES = {
  message_header: 'Connected successfully to remote therapy',
  message_content: 'Message was sent to therapist \nThe session will start at the scheduled time',
  spinner_text: 'Please wait while therapist connects',
  spinner_text_mobile: 'Waiting for therapist',
  no_camera_connection: 'Openning camera',
  muted_mic_header: 'Microphone Is Mutted',
  muted_mic_message: 'Please make sure you microphone is not muted',
  no_mic_connection_header: 'Microphone is not connected',
  no_mic_connection_message: 'Please enable your microphone connection',
};

export const Role = {
  Admin: 'admin',
  Therapist: 'therapist',
  Patient: 'patient',
  Video_Patient: 'video_patient',
};

export const CHECK_PEER_STATUS_AFTER_ERROR_TIME = 30000;
export const CAMERA_FRAME_RATE = 15;
export const MEDIA_RECORDER_AUDIO_BITS_PER_SECOND = 128000;
export const MEDIA_RECORDER_AUDIO_MIME_TYPE = 'audio/webm; codecs=opus';

export enum WeekChange {
  Forward,
  Backward,
  Current,
}

export enum Day {
  SUN,
  MON,
  TUE,
  WED,
  THU,
  FRI,
  SAT,
}

export enum DayText {
  SUN = 'Sunday',
  MON = 'Monday',
  TUE = 'Tuesday',
  WED = 'Wednesday',
  THU = 'Thursday',
  FRI = 'Friday',
  SAT = 'Saturday',
}

export enum DailyBookingViewActionType {
  None,
  CreateBooking,
  ShowCoPatients,
  ModifySession,
}

export type ShiftDay = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export const START_OF_DAY = 7;
export const END_OF_DAY = 22;
export const WEEK_DAYS = 6;
export const HOUR_SPLIT = 4;
export const TITLE_COLUMNS = 2;
export const MAX_BOOKING_PER_SLOT = 4;

export enum BookingSubscriptionStatus {
  Under = 'under-subscription',
  Over = 'over-subscription',
  Exact = 'exact-subscription',
}

export enum TherapistTypes {
  Regular = 'Regular',
  Manager = 'Manager',
}

export const LOG_ACTION_DESCRIPTION = {
  Create: 'created',
  Update: 'updated',
  Delete: 'deleted',
};

export const LOG_TABLE_DESCRIPTION = {
  availability: 'availability',
  booking: 'booking',
  game_settings: 'game settings',
  patient: 'details',
  patient_contacts: 'contacts',
  patient_departments: 'departments',
  patient_treatment: 'treatment',
  therapist: 'details',
  therapist_expertise: 'expertise',
  users: 'details',
  activity_log: 'note',
};

export const PATIENT_LOG_STORAGE_KEY = '_session_log';
