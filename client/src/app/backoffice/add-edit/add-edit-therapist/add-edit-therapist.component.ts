import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import _ from 'lodash';

import { parseEnumToDropDownItems } from '../../backoffice-util';
import { IDropItem } from '../../select/select.component';
import { TherapistTypes } from '../../../../constants';

@Component({
  selector: 'app-add-edit-therapist',
  templateUrl: './add-edit-therapist.component.html',
  styleUrls: ['./add-edit-therapist.component.scss'],
})
export class AddEditTherapistComponent implements OnInit, OnDestroy {
  @Input() editedEntity;
  @Input() institutes: [];
  @Input() departments: [];
  @Input() professions: [];
  @Input() expertises: [];
  @Output() valid = new EventEmitter<any>();
  @Output() state = new EventEmitter<any>();
  @Output() openTherapistScheduler = new EventEmitter<any>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  filteredDepartments:any = [];
  filteredExpertises = [];
  therapistTypes: IDropItem[] = [];

  constructor() {}

  ngOnInit() {
    this.customForm = new FormGroup({
      first_name: new FormControl(this.getDefaultValue(this.editedEntity, 'first_name')),
      last_name: new FormControl(this.getDefaultValue(this.editedEntity, 'last_name')),
      username: new FormControl(this.getDefaultValue(this.editedEntity, 'user_name')),
      email: new FormControl(this.getDefaultValue(this.editedEntity, 'email')),
      institute_id: new FormControl(this.getDefaultValue(this.editedEntity, 'institute_id')),
      departments_ids: new FormControl(this.getDefaultValue(this.editedEntity, 'departments_ids')),
      profession_id: new FormControl(this.getDefaultValue(this.editedEntity, 'profession_id')),
      expertises_ids: new FormControl(this.getDefaultValue(this.editedEntity, 'expertises_ids')),
      therapist_type: new FormControl(this.getDefaultValue(this.editedEntity, 'therapist_type')),
    });

    this.initDropDowns();
    this.onChanges();
    (window as any).form = this.customForm;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getDefaultValue(editedEntity, fieldName) {
    if (fieldName.endsWith('ids')) {
      return (editedEntity && editedEntity[fieldName][0] !== null && editedEntity[fieldName]) || [];
    } else {
      return (editedEntity && editedEntity[fieldName]) || '';
    }
  }

  filterDepartmentsByInstituteId(instituteId, departments) {
    if (!instituteId) {
      return [];
    }
    return departments.filter((dep) => dep.institute_id === instituteId);
  }

  filterExpertisesByProfessionId(professionId, expertises) {
    return expertises.filter((expertise) => expertise.profession_id === professionId);
  }

  initDropDowns() {
    this.therapistTypes = parseEnumToDropDownItems(TherapistTypes);
    this.setDropDownAvailability(this.institutes, 'institute_id');

    this.filteredDepartments = this.filterDepartmentsByInstituteId(
      this.customForm.value.institute_id,
      this.departments
    );
    this.setDropDownAvailability(this.filteredDepartments, 'departments_ids');

    this.setDropDownAvailability(this.professions, 'profession_id');

    this.filteredExpertises = this.filterExpertisesByProfessionId(this.customForm.value.profession_id, this.expertises);
    this.setDropDownAvailability(this.filteredExpertises, 'expertises_ids');
    
    if (this.editedEntity) {
      this.customForm.controls.institute_id.disable();
    }
  }

  setDropDownAvailability(field: string[], fieldName: string): void {
    field?.length > 0 ? this.customForm.controls[fieldName].enable() : this.customForm.controls[fieldName].disable();
  }

  goToSchedule() {
    this.openTherapistScheduler.emit();
  }

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.valid.emit(status === 'VALID');
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        this.state.emit(state);
      })
    );
    this.subscription.add(
      this.customForm.controls.institute_id.valueChanges.subscribe((instituteId) => {
        this.filteredDepartments = this.filterDepartmentsByInstituteId(instituteId, this.departments);
        this.filteredDepartments.length > 0
          ? this.customForm.controls.departments_ids.enable()
          : this.customForm.controls.departments_ids.disable();
        const teleItem = _.remove(this.filteredDepartments, (item) => {
          return item.name.toLowerCase() == 'tele';
        });
        if (teleItem.length) {
          this.filteredDepartments.unshift(teleItem[0]);
        }
      })
    );
    this.subscription.add(
      this.customForm.controls.profession_id.valueChanges.subscribe((professionId) => {
        this.filteredExpertises = this.filterExpertisesByProfessionId(professionId, this.expertises);
        this.customForm.controls.expertises_ids.setValue([]);
        this.filteredExpertises.length > 0
          ? this.customForm.controls.expertises_ids.enable()
          : this.customForm.controls.expertises_ids.disable();
      })
    );
  }
}
