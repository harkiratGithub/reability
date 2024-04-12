import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, SimpleChanges } from '@angular/core';
import { map, forEach, isNil, find } from 'lodash';
import { FormGroup, FormControl, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';

import { PayerDropDownValues } from 'src/constants';
import { tableColumns, InnerViewActions, FormStatus, UNLIMITED_SELECTION_OPTION } from '../../backoffice-constants';
import { IBackOfficeTabAction, IBackOfficeInternalViewAction, IDropDownItem } from '../../../../types';
import { getMaxPatientsOptions, getNumericDropDownValues } from '../../backoffice-util';

@Component({
  selector: 'app-add-edit-patient-treatment',
  templateUrl: './add-edit-patient-treatment.component.html',
  styleUrls: ['./add-edit-patient-treatment.component.scss'],
})
export class AddEditPatientTreatmentComponent implements OnInit, OnDestroy {
  @Input() editedEntity;
  @Input() professions;
  @Input() expertises;
  @Input() deletePatientTreatmentFunc: (id: number) => number;
  @Output() innerAction = new EventEmitter<IBackOfficeInternalViewAction>();
  @Output() setScheduleView = new EventEmitter<void>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  treatments = [];
  filteredExpertises = [];
  payersDropDownValues = PayerDropDownValues;
  payers: IDropDownItem[];
  maxPatientsOptions: IDropDownItem[];
  timesPerWeekOptions: IDropDownItem[];
  TIMES_PER_WEEK_LIMIT = 4;
  MAX_PATIENTS_LIMIT = 4;
  newTreatmentsControls: FormArray;
  columns = tableColumns.treatments;
  actions: IBackOfficeTabAction[] = [
    {
      text: 'Edit',
      action: (row) => this.switchToEditMode(row.id),
      image: 'assets/backoffice/icon_back_office_edit.svg',
      enabled: true,
    },
    {
      text: 'Delete',
      action: (row) => this.deletePatientTreatment(row.id),
      image: 'assets/backoffice/icon_back_office_delete.svg',
      enabled: true,
    },
    {
      text: 'Schedule',
      action: () => this.openSchedule(),
      image: 'assets/backoffice/icon_back_office_schedule.svg',
      enabled: true,
    },
  ];
  isValid = false;
  formState: any;
  showBookingExistsMessage = false;
  currentPatientTreatmentBookingsAmount = 0;
  editTreatmentMode = false;
  currentPatientTreatmentId: number;
  currentExpertiseId: number;

  constructor() {}

  ngOnInit() {
    this.treatments = this.editedEntity.treatments;
    this.customForm = new FormGroup({
      profession_id: new FormControl(this.getDefaultValue(this.editedEntity, 'profession_id')),
      expertise_id: new FormControl(this.getDefaultValue(this.editedEntity, 'expertise_id')),
      payer: new FormControl(this.getDefaultValue(this.editedEntity, 'payer')),
      times_per_week: new FormControl(this.getDefaultValue(this.editedEntity, 'times_per_week')),
      max_patients: new FormControl(this.getDefaultValue(this.editedEntity, 'max_patients')),
    });

    this.payers = this.parsedEnumToDropDownItems(this.payersDropDownValues);
    this.maxPatientsOptions = getMaxPatientsOptions();
    this.timesPerWeekOptions = getNumericDropDownValues(this.TIMES_PER_WEEK_LIMIT);
    this.initDropDowns();
    this.onChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.editedEntity) {
      this.treatments = this.parseTreatments(this.editedEntity.treatments);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getDefaultValue(editedEntity, fieldName) {
    return (editedEntity && editedEntity[fieldName]) || '';
  }

  filterExpertisesByProfessionId(professionId, expertises) {
    return expertises.filter(
      (expertise) =>
        expertise.profession_id === professionId &&
        ((this.editTreatmentMode && expertise.id === this.currentExpertiseId) ||
          !find(this.treatments, { expertise_id: expertise.id }))
    );
  }

  initDropDowns() {
    this.setDropDownAvailability(this.professions, 'profession_id');

    this.filteredExpertises = this.filterExpertisesByProfessionId(this.customForm.value.profession_id, this.expertises);
    this.setDropDownAvailability(this.filteredExpertises, 'expertise_id');
  }

  setDropDownAvailability(field: string[], fieldName: string): void {
    field?.length > 0 ? this.customForm.controls[fieldName].enable() : this.customForm.controls[fieldName].disable();
  }

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.isValid = status === FormStatus.Valid && this.filteredExpertises.length > 0;
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        this.formState = state;
      })
    );
    this.subscription.add(
      this.customForm.controls.profession_id.valueChanges.subscribe((professionId) => {
        this.filteredExpertises = this.filterExpertisesByProfessionId(professionId, this.expertises);
        if (!this.editTreatmentMode) {
          this.customForm.controls.expertise_id.setValue([]);
        }
        this.filteredExpertises.length > 0 && !this.editTreatmentMode
          ? this.customForm.controls.expertise_id.enable()
          : this.customForm.controls.expertise_id.disable();
      })
    );
  }

  parsedEnumToDropDownItems(payerEnum): IDropDownItem[] {
    return map(payerEnum, (value) => {
      return {
        id: value,
        name: value,
      };
    });
  }

  getNewTreatmentFormGroup(
    professionId = null,
    expertiseId = null,
    payer = null,
    timesPerWeek = null,
    maxPatients = null
  ) {
    return new FormGroup({
      profession_id: new FormControl(professionId || ''),
      expertise_id: new FormControl(expertiseId || ''),
      payer: new FormControl(payer || ''),
      max_patients: new FormControl(maxPatients || 1),
      times_per_week: new FormControl(timesPerWeek || 1),
    });
  }

  deletePatientTreatment = async (id: number) => {
    this.currentPatientTreatmentBookingsAmount = await this.deletePatientTreatmentFunc(id);
    this.showBookingExistsMessage = this.currentPatientTreatmentBookingsAmount > 0;
  };

  hideBookingExistsMessage = () => {
    this.showBookingExistsMessage = false;
  };

  openSchedule = () => {
    this.setScheduleView.emit();
  };

  savePatientTreatment() {
    this.editTreatmentMode ? this.editPatientTreatment() : this.createPatientTreatment();
  }

  createPatientTreatment() {
    if (this.formState.max_patients === UNLIMITED_SELECTION_OPTION.id) {
      this.formState.max_patients = null;
    }
    const actionEventData: IBackOfficeInternalViewAction = {
      actionType: InnerViewActions.CreatePatientTreatment,
      data: this.formState,
    };
    this.innerAction.emit(actionEventData);
    forEach(this.customForm.controls, (control) => {
      control.setValue('');
    });
  }

  editPatientTreatment() {
    if (this.formState.max_patients === UNLIMITED_SELECTION_OPTION.id) {
      this.formState.max_patients = null;
    }
    const actionEventData: IBackOfficeInternalViewAction = {
      actionType: InnerViewActions.EditPatientTreatment,
      data: { id: this.currentPatientTreatmentId, expertise_id: this.currentExpertiseId, ...this.formState },
    };
    this.innerAction.emit(actionEventData);
    forEach(this.customForm.controls, (control) => {
      control.setValue('');
    });
    this.editTreatmentMode = false;
    this.setDropDownsAvailabilityByEditMode();
  }

  parseTreatments = (treatments) =>
    map(treatments, (treatment) => {
      if (isNil(treatment.max_patients)) {
        treatment.max_patients = '∞';
      } else {
        treatment.max_patients = treatment.max_patients.toString();
      }
      treatment.times_per_week = treatment.times_per_week.toString();
      return treatment;
    });

  switchToEditMode = (patientTreatmentId: number) => {
    this.editTreatmentMode = true;
    this.setCurrentTreatment(patientTreatmentId);
    this.setDropDownsAvailabilityByEditMode();
  };

  setCurrentTreatment = (patientTreatmentId: number) => {
    const treatment = find(this.treatments, { id: patientTreatmentId });
    if (!treatment) {
      return;
    }

    const { profession_id, expertise_id, payer, times_per_week, max_patients } = treatment;
    this.customForm.controls.profession_id.setValue(profession_id);
    this.customForm.controls.expertise_id.setValue(expertise_id);
    this.customForm.controls.payer.setValue(payer);
    this.customForm.controls.times_per_week.setValue(+times_per_week);
    this.customForm.controls.max_patients.setValue(max_patients === '∞' ? '0' : +max_patients);
    this.currentPatientTreatmentId = patientTreatmentId;
    this.currentExpertiseId = expertise_id;
  };

  setDropDownsAvailabilityByEditMode = () => {
    if (this.editTreatmentMode) {
      this.customForm.controls.profession_id.disable();
      this.customForm.controls.expertise_id.disable();
      return;
    }

    this.customForm.controls.profession_id.enable();
    this.customForm.controls.expertise_id.enable();
  };
}
