import { IMultiSelectOptions } from '../../types';
import * as templates from './backoffice-templates';
import { CellType, ITableColumn } from './table/table.component';

export enum mode {
  view,
  create,
  edit,
  schedule,
  expertise,
}
export const FIELDS_NOT_TO_CAPITALIZE = ['email'];
export const tableColumns: Record<string, ITableColumn[]> = {
  admins: [
    { fieldName: 'full_name', displayName: 'Name', flex: 1 },
    { fieldName: 'email', displayName: 'Email', flex: 1.2, cellType: CellType.email },
    { fieldName: 'user_name', displayName: 'Username', flex: 1 },
    {
      fieldName: 'last_login',
      displayName: 'Last Login',
      flex: 1,
      datePipe: false,
    },
  ],
  therapists: [
    { fieldName: 'full_name', displayName: 'Name', flex: 1 },
    { fieldName: 'email', displayName: 'Email', flex: 1.2, cellType: CellType.email },
    { fieldName: 'user_name', displayName: 'Username', flex: 1 },
    { fieldName: 'institute_name', displayName: 'Institute', flex: 1 },
    { fieldName: 'departments_names', displayName: 'Departments', flex: 1 },
    {
      fieldName: 'last_login',
      displayName: 'Last Login',
      flex: 1,
      datePipe: false,
    },
  ],
  patients: [
    { fieldName: 'full_name', displayName: 'Name', flex: 1 },
    { fieldName: 'email', displayName: 'Email', flex: 1.2, cellType: CellType.email },
    { fieldName: 'user_name', displayName: 'Username', flex: 1 },
    { fieldName: 'profession_name', displayName: 'Profession', flex: 1 },
    { fieldName: 'phone', displayName: 'Phone', flex: 1, cellType: CellType.copyToClip },
    {
      fieldName: 'last_login',
      displayName: 'Last Login',
      flex: 1,
      datePipe: false,
    },
  ],
  institutes: [
    {
      fieldName: 'logo_url',
      displayName: 'Logo',
      width: '80px',
      cellType: CellType.img,
    },
    { fieldName: 'name', displayName: 'Name', flex: 1 },
    { fieldName: 'departmentNames', displayName: 'Departments', flex: 1 },
    {
      fieldName: 'created_at',
      displayName: 'Registration Date',
      flex: 1,
      datePipe: true,
    },
  ],
  games: [{ fieldName: '', displayName: 'games', flex: 1 }],
  followups: [
    { fieldName: 'date', displayName: 'Scheduled date', flex: 1, datePipe: true },
    { fieldName: 'patient_full_name', displayName: 'Patient Name', flex: 1, onClick: () => {} },
    { fieldName: 'therapist_full_name', displayName: 'Assignee', flex: 1 },
    { fieldName: 'description', displayName: 'Description', flex: 3 },
    { fieldName: 'email', displayName: 'Email', flex: 2 },
    { fieldName: 'phone', displayName: 'Phone', flex: 1.5 },
  ],
  professions: [
    {
      fieldName: 'logo_url',
      displayName: 'Logo',
      width: '80px',
      cellType: CellType.img,
    },
    { fieldName: 'name', displayName: 'Name', flex: 1 },
    { fieldName: 'expertiseNames', displayName: 'Expertise', flex: 2 },
  ],
  treatments: [
    { fieldName: 'profession_name', displayName: 'Profession', flex: 1 },
    { fieldName: 'expertise_name', displayName: 'Expertise', flex: 1 },
    { fieldName: 'payer', displayName: 'Payer', flex: 1 },
    { fieldName: 'times_per_week', displayName: 'Times Per week', flex: 1 },
    { fieldName: 'max_patients', displayName: 'Max Patients', flex: 1 },
  ],
  leads: [
    { fieldName: 'full_name', displayName: 'Name', flex: 1 },
    { fieldName: 'email', displayName: 'Email', flex: 1, cellType: CellType.email },
    { fieldName: 'phone', displayName: 'Phone', flex: 1, cellType: CellType.copyToClip },
    { fieldName: 'reminder', displayName: 'Note', flex: 1 },
    { fieldName: 'reminder_created_at', displayName: 'Note Date', flex: 1, datePipe: true },
    { fieldName: 'created_at', displayName: 'Created at', flex: 1, datePipe: true },
  ],
  expertise: [
    { fieldName: 'name', displayName: 'Name', flex: 2 },
    { fieldName: 'max_patients', displayName: 'Max Patients', flex: 1 },
    { fieldName: 'duration', displayName: 'Duration', flex: 1 },
  ],
};

export enum Tabs {
  admins,
  therapists,
  patients,
  games,
  institutes,
  followups,
  professions,
  leads,
}

export enum PatientFilterOrder {
  suspend,
  techIssue,
  pending,
}
export const FILTERS_ORDER: Record<Tabs, any> = {
  [Tabs.patients]: PatientFilterOrder,
  [Tabs.admins]: [],
  [Tabs.therapists]: [],
  [Tabs.institutes]: [],
  [Tabs.games]: [],
  [Tabs.followups]: [],
  [Tabs.professions]: [],
  [Tabs.leads]: [],
};

interface ITabData {
  name: string;
  displayName: string;
  messageDisplayName: string;
  nameField: string;
  backButtonText: string;
  editButtonText: string;
  newButtonText: string;
  addEditTemplate?: any[];
}

export const tabsData: ITabData[] = [
  {
    name: Tabs[Tabs.admins],
    displayName: 'ADMINS',
    messageDisplayName: 'admin',
    nameField: 'full_name',
    backButtonText: 'ADD NEW ADMIN',
    editButtonText: 'EDIT ADMIN',
    newButtonText: 'NEW ADMIN',
    addEditTemplate: templates.adminTemplate,
  },
  {
    name: Tabs[Tabs.therapists],
    displayName: 'THERAPISTS',
    messageDisplayName: 'therapist',
    nameField: 'full_name',
    backButtonText: 'ADD NEW THERAPIST',
    editButtonText: 'EDIT THERAPIST',
    newButtonText: 'NEW THERAPIST',
    addEditTemplate: templates.therapistTemplate,
  },
  {
    name: Tabs[Tabs.patients],
    displayName: 'PATIENTS',
    messageDisplayName: 'patient',
    nameField: 'full_name',
    backButtonText: 'ADD NEW PATIENT',
    newButtonText: 'NEW PATIENT',
    editButtonText: 'EDIT PATIENT',
    addEditTemplate: templates.patientTemplate,
  },
  {
    name: Tabs[Tabs.games],
    displayName: 'GAMES',
    messageDisplayName: 'games',
    nameField: '',
    backButtonText: 'ADD NEW GAME',
    editButtonText: 'EDIT GAME',
    newButtonText: 'NEW GAME',
  },
  {
    name: Tabs[Tabs.institutes],
    displayName: 'INSTITUTES',
    messageDisplayName: 'institute',
    nameField: 'name',
    backButtonText: 'ADD NEW INSTITUTE',
    editButtonText: 'EDIT INSTITUTE',
    newButtonText: 'NEW INSITUTE',
  },
  {
    name: Tabs[Tabs.followups],
    displayName: 'FOLLOWUPS',
    messageDisplayName: 'followup',
    nameField: ' ',
    backButtonText: 'ADD NEW FOLLOWUP',
    editButtonText: 'EDIT FOLLOWUP',
    newButtonText: 'NEW FOLLOWUP',
  },
  {
    name: Tabs[Tabs.professions],
    displayName: 'PROFESSIONS',
    messageDisplayName: 'profession',
    nameField: 'name',
    backButtonText: 'ADD NEW PROFESSION',
    editButtonText: 'EDIT PROFESSION',
    newButtonText: 'NEW PROFESSION',
  },
  {
    name: Tabs[Tabs.leads],
    displayName: 'LEADS',
    messageDisplayName: 'lead',
    nameField: 'full_name',
    backButtonText: 'ADD NEW LEAD',
    editButtonText: 'EDIT LEAD',
    newButtonText: 'NEW LEAD',
  },
];

export const getRemoveEntityVerificationText = (tabData: ITabData, entityName: string): string => {
  const verificationText = `Are you sure you want to remove ${tabData.messageDisplayName} ${
    entityName || ''
  } from the system ?`;
  return verificationText;
};
export enum PatientView {
  Details,
  Treatments,
  Schedule,
}

export enum InnerViewActions {
  CreatePatientTreatment,
  EditPatientTreatment,
  DeletePatientTreatment,
  ModifyBookingSession,
  DeleteBookingSession,
  ResetPatientPassword,
}

export enum FormStatus {
  Valid = 'VALID',
  Invalid = 'INVALID',
}

export const UNLIMITED_SELECTION_OPTION = {
  id: 0,
  name: 'Unlimited',
};

export const MAX_PATIENTS_LIMIT = 4;

export enum BookingDeleteOptions {
  SpecificTreatment = 0,
  AllTreatmentsOnSameDayAndTime,
  AllTreatmentsOnSamePrescription,
}

export const TABS_WITH_SHARED_FILTERS = [Tabs.therapists, Tabs.patients];

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
export const DEFAULT_DURATION = 45;

export const ACTIVE_INACTIVE_SELECT_OPTIONS: IMultiSelectOptions[] = [
  { value: true, displayName: 'Active' },
  { value: false, displayName: 'Inactive' },
];
