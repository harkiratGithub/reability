import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, SimpleChanges } from '@angular/core';
import { map, forEach, isNil, find } from 'lodash';
import { FormGroup, FormControl, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';

import { tableColumns, FormStatus, UNLIMITED_SELECTION_OPTION } from '../../backoffice-constants';
import { IBackOfficeTabAction, IDropDownItem } from '../../../../types';
import { getMaxPatientsOptions, getDurationOptions } from '../../backoffice-util';

@Component({
  selector: 'app-add-edit-expertise',
  templateUrl: './add-edit-expertise.component.html',
  styleUrls: ['./add-edit-expertise.component.scss'],
})
export class AddEditExpertiseComponent implements OnInit, OnDestroy {
  @Input() expertiseArray;
  @Input() deleteExpertiseFunc: (id: number) => any;
  @Output() onCreateExpertise = new EventEmitter<any>();
  @Output() onUpdateExpertise = new EventEmitter<any>();
  @Output() goBack = new EventEmitter<void>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  durationDropDownValues;
  durationOptions: IDropDownItem[];
  maxPatientsOptions: IDropDownItem[];
  newExpertiseControls: FormArray;
  columns = tableColumns.expertise;
  actions: IBackOfficeTabAction[] = [
    {
      text: 'Edit',
      action: (row) => this.switchToEditMode(row.id),
      image: 'assets/backoffice/icon_back_office_edit.svg',
      enabled: true,
    },
    {
      text: 'Delete',
      action: (row) => this.deleteExpertise(row.id),
      image: 'assets/backoffice/icon_back_office_delete.svg',
      enabled: true,
    },
  ];
  isValid = false;
  formState: any;
  showRelatedExpertiseItemsExists = false;
  showOneExpertiseMessage = false;
  editExpertiseMode = false;
  currentExpertise;
  formattedExpertiseArray;
  currentExpertisePatientTreatmentAmount = 0;
  currentExpertiseTherapistAmount = 0;

  constructor() {}

  ngOnInit() {
    this.customForm = new FormGroup({
      name: new FormControl(this.getDefaultValue(this.currentExpertise, 'name')),
      max_patients: new FormControl(this.getDefaultValue(this.currentExpertise, 'max_patients')),
      duration: new FormControl(this.getDefaultValue(this.currentExpertise, 'duration')),
    });

    this.maxPatientsOptions = getMaxPatientsOptions();
    this.durationOptions = getDurationOptions();

    this.onChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.expertiseArray) {
      this.formattedExpertiseArray = this.parseExpertise(this.expertiseArray);
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getDefaultValue(expertise, fieldName) {
    return (expertise && expertise[fieldName]) || '';
  }

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.isValid = status === FormStatus.Valid;
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        this.formState = state;
      })
    );
  }

  parseExpertiseArray = (expertiseArray) =>
    map(expertiseArray, (expertise) => {
      if (isNil(expertise.max_patients)) {
        expertise.max_patients = '∞';
      } else {
        expertise.max_patients = expertise.max_patients.toString();
      }
      expertise.duration = expertise.duration.toString();
      return expertise;
    });

  deleteExpertise = async (expertiseId: number) => {
    if (this.expertiseArray.length === 1) {
      this.showOneExpertiseMessage = true;
      return;
    }

    const data = await this.deleteExpertiseFunc(expertiseId);

    this.currentExpertisePatientTreatmentAmount = data.numberOfTreatments;
    this.currentExpertiseTherapistAmount = data.numberOfTherapists;
    this.showRelatedExpertiseItemsExists =
      this.currentExpertisePatientTreatmentAmount > 0 || this.currentExpertiseTherapistAmount > 0;

    forEach(this.customForm.controls, (control) => {
      control.setValue('');
    });
    this.editExpertiseMode = false;
  };

  hideRelatedExpertiseItemsExists = () => {
    this.showRelatedExpertiseItemsExists = false;
  };

  hideOneExpertiseMessage = () => {
    this.showOneExpertiseMessage = false;
  };

  saveExpertise() {
    this.editExpertiseMode ? this.editExpertise() : this.createExpertise();
  }

  createExpertise() {
    if (this.formState.max_patients === UNLIMITED_SELECTION_OPTION.id) {
      this.formState.max_patients = null;
    }
    this.onCreateExpertise.emit({ profession_id: this.getProfessionId(), ...this.formState });
    forEach(this.customForm.controls, (control) => {
      control.setValue('');
    });
  }

  editExpertise() {
    if (this.formState.max_patients === UNLIMITED_SELECTION_OPTION.id) {
      this.formState.max_patients = null;
    }
    this.onUpdateExpertise.emit({ id: this.currentExpertise.id, ...this.formState });
    forEach(this.customForm.controls, (control) => {
      control.setValue('');
    });
    this.editExpertiseMode = false;
  }

  parseExpertise = (expertiseArr) =>
    map(expertiseArr, (expertise) => {
      if (isNil(expertise.max_patients)) {
        expertise.max_patients = '∞';
      } else {
        expertise.max_patients = expertise.max_patients.toString();
      }
      expertise.duration = expertise.duration.toString();
      return expertise;
    });

  switchToEditMode = (expertiseId: number) => {
    this.editExpertiseMode = true;
    this.setCurrentExpertise(expertiseId);
  };

  setCurrentExpertise = (expertiseId: number) => {
    const expertise = find(this.expertiseArray, { id: expertiseId });
    if (!expertise) {
      return;
    }

    const { name, max_patients, duration } = expertise;
    this.customForm.controls.name.setValue(name);
    this.customForm.controls.max_patients.setValue(max_patients === '∞' ? '0' : +max_patients);
    this.customForm.controls.duration.setValue(+duration);
    this.currentExpertise = expertise;
  };

  getProfessionName = () => (this.expertiseArray?.length > 0 ? this.expertiseArray[0].profession_name : '');

  getProfessionId = () => (this.expertiseArray?.length > 0 ? this.expertiseArray[0].profession_id : 0);

  onClickBack = () => {
    this.goBack.emit();
  };
}
