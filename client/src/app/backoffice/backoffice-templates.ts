import * as _ from 'lodash';

const therapistTemplate: any[] = [
  {
    fieldName: 'first_name',
    label: 'First Name:',
    inputType: 'text',
    required: true,
  },
  {
    fieldName: 'last_name',
    label: 'Last Name:',
    inputType: 'text',
    required: true,
  },
  {
    fieldName: 'username',
    label: 'Username:',
    inputType: 'text',
    required: false,
  },
  {
    fieldName: 'email',
    label: 'Email:',
    inputType: 'email',
    required: true,
  },
  {
    fieldName: 'institute_id',
    label: 'Institute:',
    inputType: 'custom_select',
    required: true,
    dataField: 'institutes',
    disableFunc: (items) => items.length === 0,
  },
  {
    fieldName: 'departments_ids',
    label: 'Departments:',
    inputType: 'custom_select',
    required: true,
    dataField: 'departments',
    firstParamName: 'institute_id', // institute fieldName
    getItemsFunc: (instituteId, departments) => departments.filter((dep) => dep.institute_id === instituteId),
    disableFunc: (items) => items.length === 0,
  },
];

const patientTemplate = _.cloneDeep(therapistTemplate);
patientTemplate.push(
  {
    fieldName: 'is_patient_video',
    label: 'Patient Video:',
    inputType: 'boolean',
  },
  {
    fieldName: 'disabled_skeleton',
    label: 'Disabled Skeleton:',
    inputType: 'boolean',
  }
);

const adminTemplate: any[] = [
  {
    fieldName: 'first_name',
    label: 'First Name:',
    inputType: 'text',
    required: true,
  },
  {
    fieldName: 'last_name',
    label: 'Last Name:',
    inputType: 'text',
    required: true,
  },
  {
    fieldName: 'username',
    label: 'Username:',
    inputType: 'text',
    required: false,
  },
  {
    fieldName: 'email',
    label: 'Email:',
    inputType: 'email',
    required: true,
  },
];

export { adminTemplate, therapistTemplate, patientTemplate };
