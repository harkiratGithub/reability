import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';
import { isNil } from 'lodash';

import { DEFAULT_DURATION } from '../../backoffice-constants';
import { IDropDownItem } from '../../../../types';
import { getDurationOptions, getMaxPatientsOptions } from '../../backoffice-util';

interface IEditedEntity {
  expertises: any[];
  id: number;
  image_id: number;
  logo_url: string;
  name: string;
}

@Component({
  selector: 'app-add-edit-profession',
  templateUrl: './add-edit-profession.component.html',
  styleUrls: ['./add-edit-profession.component.scss'],
})
export class AddEditProfessionComponent implements OnInit, OnDestroy {
  @Input() editedEntity: IEditedEntity;
  @Output() valid = new EventEmitter<boolean>();
  @Output() state = new EventEmitter<any>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  addExpertisePlaceHolder = 'Write Expertise Name';
  file: File;
  maxPatientsOptions: IDropDownItem[];
  durationOptions: IDropDownItem[];

  constructor() {}

  ngOnInit() {
    this.maxPatientsOptions = getMaxPatientsOptions();
    this.durationOptions = getDurationOptions();
    this.customForm = new FormGroup({
      name: new FormControl(this.getDefaultValue(this.editedEntity, 'name')),
      logo: new FormControl(this.getDefaultValue(this.editedEntity, 'logo_url')),
      expertises: new FormArray(this.getDefaultValueArray(this.editedEntity, 'expertises')),
    });

    this.setDisabledState();
    this.onChanges();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  setDisabledState() {
    this.customForm.controls.logo.disable();
    if (this.editedEntity) {
      this.disableEditedExpertises();
    }
  }

  disableEditedExpertises() {
    this.editedEntity.expertises.forEach((_, index) => {
      this.expertises.controls[index].disable();
    });
  }

  get expertises() {
    return this.customForm.get('expertises') as FormArray;
  }

  getDefaultValueArray(editedEntity, fieldName) {
    const defaultResult = [this.getNewExpertiseFormGroup()];

    if (!editedEntity || !editedEntity[fieldName]) {
      return defaultResult;
    }
    const editedEntityExpertises = editedEntity[fieldName].map((expertise) =>
      this.getNewExpertiseFormGroup(expertise.name, expertise.expertise_id, expertise.max_patients, expertise.duration)
    );
    return editedEntityExpertises.length === 0 ? defaultResult : editedEntityExpertises;
  }

  getNewExpertiseFormGroup(name = null, id = null, maxPatients = null, duration = null) {
    return new FormGroup({
      name: new FormControl(name || ''),
      id: new FormControl(id || ''),
      max_patients: new FormControl(maxPatients || 1),
      duration: new FormControl(duration || DEFAULT_DURATION),
    });
  }

  getDefaultValue(editedEntity, fieldName) {
    const value = (editedEntity && editedEntity[fieldName]) || '';
    if (fieldName === 'logo_url' && value) {
      const splitedImageUrl = value.split('/');
      const imageName = splitedImageUrl[splitedImageUrl.length - 1];
      return imageName;
    }
    return value;
  }

  filterExpertisesByProfessionId(professionId, expertises) {
    if (!professionId) {
      return [];
    }
    return expertises.filter((expertise) => expertise.profession_id === professionId);
  }

  addNewExpertise() {
    this.expertises.push(this.getNewExpertiseFormGroup());
  }

  deleteExpertiseField(index) {
    this.expertises.removeAt(index);
  }

  isExpertiseFieldDisabled(index) {
    return this.editedEntity && index < this.editedEntity.expertises.length;
  }

  onFileChange(event) {
    this.setFile(event.target.files[0]);
    this.setLogoFileName(event.target.files[0] && event.target.files[0].name);
  }

  deleteImage() {
    this.setFile(null);
    this.setLogoFileName('');
  }

  setFile(file) {
    this.file = file;
  }

  setLogoFileName(value) {
    this.customForm.get('logo').setValue(value);
  }

  isExpertiseDefined = (): boolean => {
    if (!this.customForm?.value?.expertises) {
      return !isNil(this.editedEntity);
    }
    const validExpertises = this.customForm.value.expertises.filter((expertise) => expertise.name.length > 0);
    return validExpertises.length > 0;
  };

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.valid.emit(status === 'VALID' && this.isExpertiseDefined());
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        this.state.emit({ ...this.customForm.getRawValue(), logo: this.file });
      })
    );
  }
}
