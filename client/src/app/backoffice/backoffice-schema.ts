import { IUserFilters } from '../../types';
import { Tabs } from './backoffice-constants';

export const INITIAL_BACK_OFFICE_STATE: IBackOfficeState = {
  entityType: null,
  lastPatientId: null,
  entityId: null,
  userFilters: {
    departments: { isActive: false, data: [] },
    institutes: { isActive: false, data: [] },
    suspend: { isActive: false, data: [] },
    pending: { isActive: false, data: [] },
    techIssue: { isActive: false },
  },
};

export interface IBackOfficeState {
  entityType: Tabs;
  lastPatientId: number;
  entityId: number;
  userFilters: IUserFilters;
}
