import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, FormArray } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add-edit-institute',
  templateUrl: './add-edit-institute.component.html',
  styleUrls: ['./add-edit-institute.component.scss']
})
export class AddEditInstituteComponent implements OnInit, OnDestroy {
  @Input() editedEntity;
  @Output() valid = new EventEmitter<any>();
  @Output() state = new EventEmitter<any>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  addDepartmentPlaceHolder = 'Write Department Name';
  file;

  constructor() {}

  ngOnInit() {
    this.customForm = new FormGroup({
      name: new FormControl(this.getDefaultValue(this.editedEntity, 'name')),
      logo: new FormControl(this.getDefaultValue(this.editedEntity, 'logo_url')),
      departments: new FormArray(this.getDefaultValueArray(this.editedEntity, 'departments'))
    });

    this.setDisabledState();
    this.onChanges();
    // tslint:disable-next-line:no-string-literal
    window['form'] = this.customForm;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  setDisabledState() {
    this.customForm.controls.logo.disable();
    if (this.editedEntity) {
      this.disableEditedDepartments();
    }
  }

  disableEditedDepartments() {
    this.editedEntity.departments.forEach((_, index) => {
      this.departments.controls[index].disable();
    });
  }

  get departments() {
    return this.customForm.get('departments') as FormArray;
  }

  getDefaultValueArray(editedEntity, fieldName) {
    const defaultResult = [
      this.getNewDepartmentFormGroup('', ''),
      this.getNewDepartmentFormGroup('', ''),
      this.getNewDepartmentFormGroup('', ''),
    ];

    if (!editedEntity || !editedEntity[fieldName]) {
      return defaultResult;
    }
    const editedEntityDepartments = editedEntity[fieldName].map(
      department => this.getNewDepartmentFormGroup(department.name, department.department_id)
    );
    return editedEntityDepartments.length === 0 ? defaultResult : editedEntityDepartments;
  }

  getNewDepartmentFormGroup(name = null, id = null) {
    return new FormGroup({
      name: new FormControl(name || ''),
      id: new FormControl(id || '')
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

  filterDepartmentsByInstituteId(instituteId, departments) {
    if (!instituteId) {
      return [];
    }
    return departments.filter(dep => dep.institute_id === instituteId);
  }

  addNewDepartment() {
    this.departments.push(this.getNewDepartmentFormGroup());
  }

  deleteDepartmentField(index) {
    this.departments.removeAt(index);
  }

  isDepartmentFieldDisabled(index) {
    return this.editedEntity && index < this.editedEntity.departments.length;
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

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe(status => {
        this.valid.emit(status === 'VALID');
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe(state => {
        this.state.emit({ ...this.customForm.getRawValue(), logo: this.file });
      })
    );
  }
}
