import _ from 'lodash';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

interface IFollowupEntity {
  id: number;
  therapist_id?: number;
  date: Date;
  description: string;
  patient_id: number;
  done: boolean;
  patient_full_name?: string;
  therapist_full_name?:string;
}
@Component({
  selector: 'app-add-edit-followup',
  templateUrl: './add-edit-followup.component.html',
  styleUrls: ['./add-edit-followup.component.scss'],
})
export class AddEditFollowupComponent implements OnInit {
  @Input() editedEntity: IFollowupEntity;
  @Input() patients: [];
  @Input() therapists: [{ id: number; name: string }];
  @Output() valid = new EventEmitter<boolean>();
  @Output() state = new EventEmitter<IFollowupEntity>();

  subscription: Subscription = new Subscription();
  minDate = new Date();
  customForm: FormGroup;

  constructor() {}

  ngOnInit(): void {
    this.customForm = new FormGroup({
      name: new FormControl(this.getDefaultValue(this.editedEntity, 'patient_full_name')),
      date: new FormControl(this.getDefaultValue(this.editedEntity, 'date')),
      description: new FormControl(this.getDefaultValue(this.editedEntity, 'description')),
      therapist_id: new FormControl(this.getDefaultValue(this.editedEntity, 'therapist_id')),
    });

    this.initUndefinedAssignee();
    this.initDropDowns();
    this.subscribeToFormChanges();
  }

  getDefaultValue(editedEntity: IFollowupEntity, fieldName: string) {
    switch (fieldName) {
      case 'therapist_id':
        return (editedEntity && editedEntity[fieldName]) || 0;
      case 'date':
        return (editedEntity && editedEntity[fieldName]) || new Date();
      default:
        return (editedEntity && editedEntity[fieldName]) || '';
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  subscribeToFormChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.valid.emit(status === 'VALID');
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state: IFollowupEntity) => {
        this.state.emit({
          ...state,
          id: this.editedEntity.id,
          patient_id: this.editedEntity.patient_id,
          therapist_id: state.therapist_id === 0 ? null : state.therapist_id
        });
      })
    );
  }
  initDropDowns() {
    this.therapists && this.therapists.length > 0
      ? this.customForm.controls.therapist_id.enable()
      : this.customForm.controls.therapist_id.disable();
  }
  initUndefinedAssignee() {
    const selectNone = { id: 0, name: 'Select Assignee' };
    this.therapists.unshift(selectNone);
  }
}
