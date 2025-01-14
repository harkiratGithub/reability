import { Component, OnInit, Input, Output, EventEmitter, OnDestroy, SimpleChanges } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import _ from 'lodash';
import { Subscription } from 'rxjs';

import { SuspendValues, TechIssueValues } from '../../../../constants';
import { IDropItem } from '../../select/select.component';
import { InnerViewActions, PatientView } from '../../backoffice-constants';
import {
  IBackOfficeInternalViewAction,
  IBookingViewShownParams,
  IBookingAssignment,
  IDeleteBookingParams,
  IUserLogEntry,
  ICreateRemarkParams,
} from '../../../../types';

@Component({
  selector: 'app-add-edit-patient',
  templateUrl: './add-edit-patient.component.html',
  styleUrls: ['./add-edit-patient.component.scss'],
})
export class AddEditPatientComponent implements OnInit, OnDestroy {
  @Input() editedEntity;
  @Input() isPatient: boolean = false;
  // @Input() institutes: [];
  @Input() institutes: { id: number; name: string }[] = [];
  @Input() departments: [];
  @Input() professions: [];
  @Input() expertises: [];
  @Input() deletePatientTreatmentFunc: (id: number) => number;
  @Output() valid = new EventEmitter<any>();
  @Output() state = new EventEmitter<any>();
  @Output() innerAction = new EventEmitter<IBackOfficeInternalViewAction>();
  @Output() goBack = new EventEmitter<PatientView>();
  @Output() weekChanged = new EventEmitter<Date>();
  @Output() bookingViewShown = new EventEmitter<IBookingViewShownParams>();
  @Output() createBooking = new EventEmitter<IBookingAssignment>();
  @Output() deleteBooking = new EventEmitter<IDeleteBookingParams[]>();
  @Output() createRemark = new EventEmitter<ICreateRemarkParams>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  filteredDepartments = [];
  suspendOptions: IDropItem[] = [];
  techIssues: IDropItem[] = [];
  patientView: PatientView;
  viewType = PatientView;
  userLog: IUserLogEntry[] = [];
  currentRemark = '';

  ngOnInit() {
    if (this.editedEntity) {
      this.userLog = this.editedEntity.userLog;
    }
    this.patientView = this.editedEntity?.patientView ?? PatientView.Details;
    if (this.patientView !== PatientView.Details) {
      return;
    }
    this.customForm = new FormGroup({
      first_name: new FormControl(this.getDefaultValue(this.editedEntity, 'first_name')),
      last_name: new FormControl(this.getDefaultValue(this.editedEntity, 'last_name')),
      username: new FormControl({ value: this.getDefaultValue(this.editedEntity, 'user_name'), disabled: true }),
      email: new FormControl(this.getDefaultValue(this.editedEntity, 'email')),
      institute_id: new FormControl(this.getDefaultValue(this.editedEntity, 'institute_id')),
      departments_ids: new FormControl(this.getDefaultValue(this.editedEntity, 'departments_ids')),
      phone: new FormControl(this.getDefaultValue(this.editedEntity, 'phone')),
      suspend: new FormControl(this.getDefaultValue(this.editedEntity, 'suspend')),
      tech_issue: new FormControl(this.getDefaultValue(this.editedEntity, 'tech_issue')),
      tech_reason: new FormControl(this.getDefaultValue(this.editedEntity, 'tech_reason')),
      primary_contact_full_name: new FormControl(this.getDefaultValue(this.editedEntity, 'primary_contact_full_name')),
      primary_contact_phone: new FormControl(this.getDefaultValue(this.editedEntity, 'primary_contact_phone')),
      primary_contact_email: new FormControl(this.getDefaultValue(this.editedEntity, 'primary_contact_email')),
      referral: new FormControl(this.getDefaultValue(this.editedEntity, 'referral')),
      notification_email: new FormControl(this.getDefaultValue(this.editedEntity, 'notification_email')),
      login_notification_email: new FormControl(this.getDefaultValue(this.editedEntity, 'login_notification_email') || ''),
      secondary_contact_full_name: new FormControl(
        this.getDefaultValue(this.editedEntity, 'secondary_contact_full_name')
      ),
      secondary_contact_phone: new FormControl(this.getDefaultValue(this.editedEntity, 'secondary_contact_phone')),
      secondary_contact_email: new FormControl(this.getDefaultValue(this.editedEntity, 'secondary_contact_email')),
    });
    this.suspendOptions = this.parsedEnumToDropDownItems(SuspendValues);
    this.techIssues = this.parsedEnumToDropDownItems(TechIssueValues);
    this.initDropDowns();
    this.onChanges();
    (window as any).form = this.customForm;
  }
  parsedEnumToDropDownItems(dropDownValues): IDropItem[] {
    return _.map(dropDownValues, (opt) => {
      return {
        id: opt,
        name: opt,
      };
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.editedEntity && changes.editedEntity) {
      this.userLog = changes.editedEntity.currentValue.userLog;
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  showTechReason() {
    return this.customForm.value?.tech_issue !== TechIssueValues.empty;
  }
  getDefaultValue(editedEntity, fieldName) {
    if (fieldName === 'departments_ids') {
      return (editedEntity && editedEntity[fieldName]?.[0] !== null && editedEntity[fieldName]) || [];
    } else if (fieldName === 'tech_issue' || fieldName === 'suspend') {
      return (editedEntity && editedEntity[fieldName]) || TechIssueValues.empty;
    }
    return (editedEntity && editedEntity[fieldName]) || '';
  }

  filterDepartmentsByInstituteId(instituteId, departments) {
    console.log("Institute Id's: ", instituteId, departments);
    if (!instituteId) {
      return [];
    }
    return departments.filter((dep) => dep.institute_id === instituteId);
  }

  initDropDowns() {
    if (this.institutes?.length > 0) {
      this.customForm.controls.institute_id.enable();
      
      if (this.isPatient) {
        const firstInstituteId = this.institutes[0]?.id ?? null;
        this.customForm.controls.institute_id.setValue(firstInstituteId);
        this.customForm.controls.institute_id.disable();
        this.filteredDepartments = this.filterDepartmentsByInstituteId(firstInstituteId, this.departments);
      } else {
        this.filteredDepartments = this.filterDepartmentsByInstituteId(
          this.customForm.value.institute_id,
          this.departments
        );
      }
    } else {
      this.customForm.controls.institute_id.disable();
      this.filteredDepartments = [];
    }
  
    if (this.filteredDepartments.length > 0) {
      this.customForm.controls.departments_ids.enable();
    } else {
      this.customForm.controls.departments_ids.disable();
    }
  }
  

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.valid.emit(status === 'VALID');
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        if (state.value?.tech_issue === TechIssueValues.empty) {
          state.value.tech_reason = '';
        }
        this.state.emit(state);
      })
    );
    this.subscription.add(
      this.customForm.controls.institute_id.valueChanges.subscribe((instituteId) => {
        this.filteredDepartments = this.filterDepartmentsByInstituteId(instituteId, this.departments);
        this.customForm.controls.departments_ids.setValue([]);
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
  }

  setFormStatus(isValid) {
    this.valid.emit(isValid);
  }

  setFormState(state) {
    this.state.emit(state);
  }

  onInnerAction(actionData: IBackOfficeInternalViewAction) {
    this.innerAction.emit(actionData);
  }

  onWeekChanged(params: Date) {
    this.weekChanged.emit(params);
  }
  onBookingViewShown(params: IBookingViewShownParams) {
    this.bookingViewShown.emit(params);
  }

  backClicked(patientView: PatientView = null) {
    this.goBack.emit(patientView);
  }

  onCreateBooking(bookingToSave: IBookingAssignment) {
    this.createBooking.emit(bookingToSave);
  }

  onDeleteBooking(deleteBookingParams: IDeleteBookingParams[]) {
    this.deleteBooking.emit(deleteBookingParams);
  }
  onCreateRemark() {
    this.createRemark.emit({
      userId: this.editedEntity.user_id,
      remarks: this.currentRemark,
    });
    this.currentRemark = '';
  }

  resetPassword(setDefaultPassword) {
    this.innerAction.emit({
      actionType: InnerViewActions.ResetPatientPassword,
      id: this.editedEntity.id,
      data: setDefaultPassword,
    });
  }
}
