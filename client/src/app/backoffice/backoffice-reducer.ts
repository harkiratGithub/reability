import { BackOfficeActions, IBackOfficeAction } from './backoffice-actions';
import { IBackOfficeState, INITIAL_BACK_OFFICE_STATE } from './backoffice-schema';

export const BackOfficeReducer = (lastState: IBackOfficeState, action: IBackOfficeAction): IBackOfficeState => {
  if (lastState === undefined) {
    return INITIAL_BACK_OFFICE_STATE;
  }

  switch (action.type) {
    case BackOfficeActions.SET_ENTITY_ID:
      return {
        ...lastState,
        entityId: action.payload,
      };
    case BackOfficeActions.SET_LAST_PATIENT_ID:
      return {
        ...lastState,
        lastPatientId: action.payload,
      };
    case BackOfficeActions.SET_ENTITY_TYPE:
      return {
        ...lastState,
        entityType: action.payload,
      };
    case BackOfficeActions.SET_USER_FILTER:
      return {
        ...lastState,
        userFilters: { ...lastState.userFilters, ...action.payload },
      };

    default:
      return lastState;
  }
};
