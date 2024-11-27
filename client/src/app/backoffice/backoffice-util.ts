import moment from 'moment';
import { reduce, map, find, orderBy } from 'lodash';
import { QueryList } from '@angular/core';

import { Role, LOG_ACTION_DESCRIPTION, LOG_TABLE_DESCRIPTION } from 'src/constants';
import { IDropDownItem, ILogValueChange, IUserLogEntry } from '../../types';
import { UNLIMITED_SELECTION_OPTION, DURATION_OPTIONS, MAX_PATIENTS_LIMIT } from './backoffice-constants';
import { IDropItem } from './select/select.component';

export const getLastLoginDate = (isoDateString: string): string => {
  if (!isoDateString) {
    return '';
  }
  return moment(isoDateString).format('DD/MM/YYYY');
};

export const transformUsers = (data) => {
  return data.map((row) => ({
    ...row,
    last_login: getLastLoginDate(row.logged_in_at),
    is_patient_video: row.role === Role.Video_Patient,
    disabled_skeleton: row.disabled_skeleton,
  }));
};

const getDepartments = (institutes) => {
  const departments = [];
  institutes.forEach((institute) => {
    if (institute.department_name) {
      departments.push({
        name: institute.department_name,
        department_id: institute.department_id,
      });
    }
  });
  return departments;
};

const getExpertises = (professions) => {
  return reduce(
    professions,
    (expertises, value) => {
      return value.expertise_name
        ? [
            {
              name: value.expertise_name,
              expertise_id: value.expertise_id,
              max_patients: value.max_patients ?? UNLIMITED_SELECTION_OPTION.name,
              duration: value.duration,
            },
            ...expertises,
          ]
        : expertises;
    },
    []
  );
};

export const getDurationOptions = (): IDropDownItem[] => {
  return DURATION_OPTIONS.map((duration) => {
    return {
      id: duration,
      name: duration.toString(),
    };
  });
};

export const getMaxPatientsOptions = (): IDropDownItem[] => {
  const ids = Array.from({ length: MAX_PATIENTS_LIMIT }, (_, i) => i + 1);
  const options = ids.map((id) => {
    return {
      id,
      name: id.toString(),
    };
  });
  return [...options, UNLIMITED_SELECTION_OPTION];
};

export const transformInstitutes = (data) => {
  const parsedRows = [];
  const uniqueInstituteIds = new Set(data.map((row) => row.id));
  uniqueInstituteIds.forEach((instituteId) => {
    const relevantRows = data.filter((row) => row.id === instituteId);
    const relatedDepartments = getDepartments(relevantRows);
    const newRow = {
      id: instituteId,
      name: relevantRows[0].institute_name,
      logo_url: relevantRows[0].logo_url,
      image_id: relevantRows[0].image_id,
      departments: getDepartments(relevantRows),
      departmentNames: relatedDepartments.map((row) => row.name).join(', '),
      created_at: new Date(relevantRows[0].created_at),
    };
    parsedRows.push(newRow);
  });
  return parsedRows;
};

export const transformRtm = (allData, cumulativeData) => {
  const parsedRows = [];
  cumulativeData?.forEach((cumData) => {
    const newRow = {
      patient_id: String(cumData?.patient_id || '-'),
      first_name: cumData?.first_name || '-',
      last_name: cumData?.last_name || '-',
      since: cumData?.since || '-',
      daysDataTransmittedInMonth: cumData?.daysDataTransmittedInMonth ? String(cumData.daysDataTransmittedInMonth) : '-',
      therapist_session_minutes: cumData?.therapist_session_minutes ? String(cumData.daysDataTransmittedInMonth) : '-',
      98975: String(cumData?.['98975'] || 0),
      98977: String(cumData?.['98977'] || 0),
      98980: String(cumData?.['98980'] || 0),
      98981: String(cumData?.['98981'] || 0),
    };

    parsedRows.push(newRow);
  });

  return parsedRows;
};

export const transformProfessions = (data) => {
  const parsedRows = [];
  const uniqueProfessionIds = new Set(data.map((row) => row.id));
  uniqueProfessionIds.forEach((professionId) => {
    const relevantRows = data.filter((row) => row.id === professionId);
    const relatedExpertises = getExpertises(relevantRows);
    const newRow = {
      id: professionId,
      name: relevantRows[0].profession_name,
      logo_url: relevantRows[0].logo_url,
      image_id: relevantRows[0].image_id,
      expertises: getExpertises(relevantRows),
      expertiseNames: relatedExpertises.map((row) => row.name).join(', '),
      created_at: new Date(relevantRows[0].created_at),
    };
    parsedRows.push(newRow);
  });
  return parsedRows;
};

export const getNumericDropDownValues = (max: number): IDropDownItem[] => {
  const ids = Array.from({ length: max }, (_, i) => i + 1);
  return ids.map((id) => {
    return {
      id,
      name: id,
    };
  });
};

export const parseEnumToDropDownItems = (dropDownValues): IDropItem[] => {
  return map(dropDownValues, (opt) => {
    return {
      id: opt,
      name: opt,
    };
  });
};

export const getFormattedUserLog = (logFromServer: Record<string, any>[], userFullName): IUserLogEntry[] =>
  map(logFromServer, (logEntry) => {
    const {
      user_id: userId,
      performed_by_user_id: performedByUserId,
      action,
      table_name: tableName,
      old_values: oldValues,
      new_values: newValues,
      remarks,
      created_at: createdAt,
      role: userRole,
      first_name: performedByFirstName,
      last_name: performedByLastName,
    } = logEntry;
    const performedByName = `${performedByFirstName} ${performedByLastName}`;
    const logDate = moment(createdAt).format('MMMM DD, YYYY H:mm');
    const actionDescription = LOG_ACTION_DESCRIPTION[action];
    const valueChanges = getValueChangesArray(oldValues, newValues);
    const role = getKeyByValue(Role, userRole);
    const subject = LOG_TABLE_DESCRIPTION[tableName];

    return {
      userId,
      userFullName,
      performedByUserId,
      performedByName,
      logDate,
      action,
      actionDescription,
      valueChanges,
      remarks,
      role,
      subject,
    } as IUserLogEntry;
  });

const getValueChangesArray = (
  oldValues: Record<string, any>[],
  newValues: Record<string, any>[]
): ILogValueChange[] => {
  if ((!oldValues || Object.keys(oldValues).length === 0) && (!newValues || Object.keys(newValues).length === 0)) {
    return [];
  }
  const values = oldValues && Object.keys(oldValues).length > 0 ? oldValues : newValues;
  return map(Object.keys(values), (key) => ({
    key: key.replace('_', ' '),
    oldValue: oldValues?.[key],
    newValue: newValues?.[key],
  }));
};

export const getKeyByValue = (object: any, value: any) => {
  return find(Object.keys(object), (key) => object[key] === value);
};

export const transformLeads = (leads: any[], isActive: boolean) => {
  const finalLeads = reduce(
    leads,
    (total, item) => {
      if (item.active === isActive) {
        const newItem = { ...item, full_name: `${item.first_name} ${item.last_name}` };
        return [...total, newItem];
      }
      return total;
    },
    []
  );
  return orderBy(finalLeads, 'created_at', 'desc');
};

export const focusOnMatMenuItem = (textToFocusOn: string, elem: QueryList<any>) => {
  elem.forEach((e) => {
    if (e.getLabel() === textToFocusOn) {
      e.focus();
    }
  });
};
