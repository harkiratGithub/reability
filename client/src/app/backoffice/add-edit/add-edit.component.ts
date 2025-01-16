import { Component, Input, EventEmitter, Output, OnChanges, OnInit } from '@angular/core';
import { map, forEach, find } from 'lodash';
import moment, { Moment } from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AjaxAdmin } from '../../common/services/ajax_admin.service';
import { AuthenticationService } from '../../common/services/authentication.service';
import { InnerViewActions, PatientView, Tabs, UNLIMITED_SELECTION_OPTION } from '../backoffice-constants';
import {
  IBackOfficeInternalViewAction,
  IPatientTreatment,
  IWeek,
  IBookingViewShownParams,
  IBookingAssignment,
  IDeleteBookingParams,
  ICreateRemarkParams,
} from '../../../types';
import { getWeek } from '../../common/date-util';
import { getFormattedOfferings } from '../../common/helpers/booking-utils';
import { AjaxService } from 'src/app/therapist/services/ajax.service';

interface IListItem {
  id: number;
  name: string;
  institute_id?: number;
  profession_id?: number;
}
@Component({
  selector: 'app-backoffice-add-edit',
  templateUrl: './add-edit.component.html',
  styleUrls: ['./add-edit.component.scss'],
})
export class AddEditComponent implements OnChanges, OnInit {
  @Input() currentTab;
  @Input() currentTabIndex;
  @Input() editedEntity;
  @Input() allInstitutes;
  @Input() allDepartments;
  @Input() allFollowups;
  @Input() allTherapists;
  @Input() allProfessions;
  @Input() allExpertises;
  @Input() isPatient = false;
  @Output() goBack = new EventEmitter();
  @Output() openTherapistScheduler = new EventEmitter();
  @Output() refreshPatientDetails = new EventEmitter<number>();
  isValidForm = false;
  tabsEnum = Tabs;
  formState;
  parsedInstitutes = [];
  parsedDepartments = [];
  parsedTherapists = [];
  parsedProfessions = [];
  parsedExpertises = [];
  INTERNAL_VIEWS_HEADERS = {
    Treatments: 'Patient Treatments',
  };
  currentWeek: IWeek;
  saveInProcess = false;

  constructor(
    private http: AjaxAdmin,
    private patientHttp: AjaxService,
    private authenticationService: AuthenticationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    if (this.editedEntity?.patientView === PatientView.Schedule) {
      this.currentWeek = getWeek(moment());
      this.setPatientTreatmentPlan(this.currentWeek.weekNumber, this.currentWeek.year);
    }
    if (this.currentTabIndex === Tabs.leads && this.editedEntity) {
      this.http.getLeadRemindersById(this.editedEntity.id).subscribe((data) => {
        const allReminders = this.getFormattedReminders(data);
        this.editedEntity = { ...this.editedEntity, allReminders };
      });
    }
  }
  getFormattedReminders = (reminders) =>
    map(reminders, (reminder) => ({
      ...reminder,
      created_at: moment(reminder.created_at).format('MMMM DD, YYYY H:mm'),
    }));

  onOpenTherapistScheduler() {
    this.openTherapistScheduler.emit(this.editedEntity);
  }

  ngOnChanges(changes) {
    if (changes.allInstitutes) {
      this.parsedInstitutes = this.parseInstitutes();
    }
    if (changes.allDepartments) {
      this.parsedDepartments = this.parseDepartments();
    }
    if (changes.allInstitutes) {
      this.parsedTherapists = this.parseTherapists();
    }
    if (changes.allProfessions) {
      this.parsedProfessions = this.parseProfessions();
    }
    if (changes.allExpertises) {
      this.parsedExpertises = this.parseExpertises();
    }
  }

  onClickBack(view = null) {
    this.saveInProcess = false;
    this.goBack.emit(view);
  }

  onClickCancel() {
    this.onClickBack();
  }

  onClickSave() {
    if (this.saveInProcess) {
      return;
    }
    this.saveInProcess = true;
    this.saveRelevant(this.currentTabIndex, this.formState);
  }

  saveRelevant(currentTabIndex, formState) {
    switch (currentTabIndex) {
      case Tabs.admins:
        this.createEditAdmin(formState);
        break;
      case Tabs.therapists:
        this.createEditTherapist(formState);
        break;
      case Tabs.patients:
        this.createEditPatient(formState);
        break;
      case Tabs.institutes:
        this.createEditInstitute(formState);
        break;
      case Tabs.followups:
        this.createEditFollowup(formState);
        break;
      case Tabs.professions:
        this.createEditProfession(formState);
        break;
      case Tabs.leads:
        this.createEditLead(formState);
        break;
      default:
        console.error('current tab index is not valid');
    }
  }

  createEditAdmin(state) {
    if (this.editedEntity) {
      this.http.editAdmin(state, this.editedEntity.id).subscribe(() => {
        this.onClickBack();
      });
      return;
    }
    this.http.createAdmin(state).subscribe(() => {
      this.onClickBack();
    });
  }

  createEditTherapist(state) {
    if (this.editedEntity) {
      this.http.editTherapist(state, this.editedEntity.id).subscribe(() => {
        this.onClickBack();
      });
      return;
    }
    this.http.createTherapist(state).subscribe(() => {
      this.onClickBack();
    });
  }

  createEditPatient(state) {
    if (this.editedEntity?.id) {
      this.savePatient(state);
      return;
    }
    if (this.editedEntity?.lead_id) {
      if (this.isPatient)
        this.patientHttp.createPatient({ ...state, lead_id: this.editedEntity.lead_id }).subscribe(() => {
          this.onClickBack();
        });
      else
        this.http.createPatient({ ...state, lead_id: this.editedEntity.lead_id }).subscribe(() => {
          this.onClickBack();
        });
      return;
    } else {
      if (this.isPatient)
        this.patientHttp.createPatient(state).subscribe(() => {
          this.onClickBack();
        });
      else
        this.http.createPatient(state).subscribe(() => {
          this.onClickBack();
        });
    }
  }

  savePatient(state) {
    switch (this.editedEntity.patientView) {
      case PatientView.Details:
        this.http.editPatient(state, this.editedEntity.id).subscribe(() => {
          this.onClickBack();
        });
        break;
      case PatientView.Treatments:
        if (state.id) {
          this.http.editPatientTreatment({ ...state, patient_id: this.editedEntity.patientId }).subscribe(() => {
            this.refreshTreatments(this.editedEntity.patientId);
          });
        } else {
          this.http.createPatientTreatment({ ...state, patient_id: this.editedEntity.patientId }).subscribe(() => {
            this.refreshTreatments(this.editedEntity.patientId);
          });
        }
        break;
    }
  }

  resetPatientPassword(patientId, setDefaultPassword) {
    this.http.resetPatientPassword(patientId, setDefaultPassword).subscribe(() => {
      this.snackBar.open('Patient password was reset successfully', '', {
        duration: 3000,
      });
    });
  }

  createEditFollowup(state) {
    const { id } = state;
    const date = new Date(state.date).toDateString();

    if (id) {
      this.http.editFollowup({ ...state, date }).subscribe(() => {
        this.onClickBack();
      });
    } else {
      const newFollowup = {
        ...state,
        date,
      };
      this.http.createFollowup(newFollowup).subscribe(() => {
        this.onClickBack();
      });
    }
  }

  createEditInstitute(state) {
    const formData = new FormData();
    formData.append('name', state.name);
    formData.append(
      'departments',
      JSON.stringify(state.departments.filter((department) => department.name.trim().length > 0))
    );
    if (state.logo) {
      formData.append('file', state.logo, state.logo.name);
    }

    if (this.editedEntity) {
      formData.append('instituteId', this.editedEntity.id);
      formData.append('imageId', this.editedEntity.image_id);
      this.http.editInstitute(formData).subscribe(() => {
        this.onClickBack();
      });
      return;
    }

    this.http.createInstitute(formData).subscribe(() => {
      this.onClickBack();
    });
  }

  createEditProfession(state) {
    state.expertises = this.handleUnlimitedValues(state.expertises, 'max_patients');
    const formData = new FormData();
    formData.append('name', state.name);
    formData.append(
      'expertises',
      JSON.stringify(state.expertises.filter((expertise) => expertise.name.trim().length > 0))
    );
    if (state.logo) {
      formData.append('file', state.logo, state.logo.name);
    }

    if (this.editedEntity) {
      formData.append('professionId', this.editedEntity.id);
      formData.append('imageId', this.editedEntity.image_id);
      this.http.editProfession(formData).subscribe(() => {
        this.onClickBack();
      });
      return;
    }

    this.http.createProfession(formData).subscribe(() => {
      this.onClickBack();
    });
  }

  createEditLead(state) {
    this.editedEntity
      ? this.http.editLead({ ...state, id: this.editedEntity.id }).subscribe(() => {
          this.onClickBack();
        })
      : this.http.createLead(state).subscribe(() => {
          this.onClickBack();
        });
  }

  parseInstitutes(): IListItem[] {
    if (!this.allInstitutes) {
      return [];
    }
    return this.allInstitutes.map((institute) => ({
      id: institute.id,
      name: institute.name,
    }));
  }

  parseProfessions(): IListItem[] {
    if (!this.allProfessions) {
      return [];
    }
    return this.allProfessions.map((profession) => ({
      id: profession.id,
      name: profession.name,
    }));
  }
  parseTherapists(): IListItem[] {
    if (!this.allTherapists) {
      return [];
    }
    return this.allTherapists.map((therapist) => ({
      id: therapist.id,
      name: `${therapist.first_name} ${therapist.last_name}`,
    }));
  }

  parseDepartments(): IListItem[] {
    if (!this.allDepartments) {
      return [];
    }
    return this.allDepartments.map((department) => ({
      id: department.id,
      name: department.name,
      institute_id: department.institute_id,
    }));
  }

  parseExpertises(): IListItem[] {
    if (!this.allExpertises) {
      return [];
    }
    return this.allExpertises.map((expertise) => ({
      id: expertise.id,
      name: expertise.name,
      max_patients: expertise.max_patients,
      profession_id: expertise.profession_id,
    }));
  }

  getDropDownsData() {
    return {
      institutes: this.parseInstitutes(),
      departments: this.parseDepartments(),
      professions: this.parseProfessions(),
      expertises: this.parseExpertises(),
    };
  }

  setFormStatus(isValid) {
    this.isValidForm = isValid;
  }

  setFormState(state) {
    this.formState = state;
  }

  onInnerAction(actionData: IBackOfficeInternalViewAction) {
    switch (actionData.actionType) {
      case InnerViewActions.CreatePatientTreatment:
      case InnerViewActions.EditPatientTreatment:
        this.savePatient(actionData.data);
        break;
      case InnerViewActions.DeletePatientTreatment:
        this.deletePatientTreatment(actionData.id);
        break;
      case InnerViewActions.ResetPatientPassword:
        this.resetPatientPassword(actionData.id, actionData.data);
        break;
    }
  }

  deletePatientTreatment = async (id: number): Promise<number> => {
    const data = await this.http.deletePatientTreatment(id).toPromise();
    if (!data?.numberOfFutureBookings) {
      this.refreshTreatments(this.editedEntity.patientId);
      return 0;
    }
    return +data.numberOfFutureBookings;
  };

  refreshTreatments(patientId: number) {
    this.http.getPatientActiveTreatments(patientId).subscribe((treatments) => {
      this.editedEntity = { ...this.editedEntity, treatments };
    });
  }

  getHeaderText(): string {
    if (!this.editedEntity?.id && !this.editedEntity?.patientId) {
      return this.currentTab.backButtonText;
    }

    switch (this.editedEntity.patientView) {
      case PatientView.Treatments:
        return this.INTERNAL_VIEWS_HEADERS.Treatments;
      case PatientView.Schedule:
        return this.editedEntity?.patientName;
      default:
        return this.currentTab.editButtonText;
    }
  }

  isInternalView(): boolean {
    return (
      this.editedEntity?.patientView === PatientView.Treatments ||
      this.editedEntity?.patientView === PatientView.Schedule
    );
  }

  showHeader = (): boolean => {
    return this.editedEntity?.patientView !== PatientView.Schedule;
  };

  handleUnlimitedValues(items: any[], fieldName: string): any[] {
    return items.map((item) => {
      if (item[fieldName] === UNLIMITED_SELECTION_OPTION.id) {
        item[fieldName] = null;
      }
      return item;
    });
  }

  isScheduleView(): boolean {
    return this.editedEntity?.patientView === PatientView.Schedule;
  }

  setPatientTreatmentPlan(week: number, year: number): void {
    const { patientId } = this.editedEntity;
    this.http.getPatientSchedule({ patientId, week, year }).subscribe((data) => {
      const treatments = this.getFormattedPatientTreatments(data.patientBooking, data.patientActiveTreatments);
      this.editedEntity = { ...this.editedEntity, treatments, patientBooking: data.patientBooking };
    });
  }

  getFormattedPatientTreatments(patientBooking: any[], patientActiveTreatments: any[]): IPatientTreatment[] {
    const treatments = map(patientActiveTreatments, (treatment) => ({
      patientId: this.editedEntity.patientId,
      patientTreatmentId: treatment.id,
      expertiseId: treatment.expertise_id,
      expertiseName: treatment.expertise_name,
      timesPerWeek: treatment.times_per_week,
      booked: 0,
      duration: treatment.duration,
      maxPatientsTreatment: 0,
      maxPatientsExpertise: 0,
    }));

    forEach(patientBooking, (booking) => {
      const treatment = find(treatments, { patientTreatmentId: booking.treatment_id });
      if (treatment) {
        treatment.booked++;
        treatment.maxPatientsExpertise = booking.expertise_max_patients;
        treatment.maxPatientsTreatment = booking.patient_treatment_max_patients;
      }
    });
    return treatments;
  }

  setExpertiseOfferings(expertiseId: number, week: number, year: number, patientId: number): void {
    this.http.getBookingAssignmentOffering({ expertiseId, week, year, patientId }).subscribe((data) => {
      const offerings = getFormattedOfferings(data.therapistAvailabilities, data.therapistsBooking);
      this.editedEntity = { ...this.editedEntity, offerings };
    });
  }

  onWeekChanged(params: Moment) {
    this.currentWeek = getWeek(params);
    this.setPatientTreatmentPlan(this.currentWeek.weekNumber, this.currentWeek.year);
  }

  onBookingViewShown(params: IBookingViewShownParams) {
    const { expertiseId, currentDate, patientId } = params;
    const week = getWeek(currentDate);
    this.setExpertiseOfferings(expertiseId, week.weekNumber, week.year, patientId);
  }

  onCreateBooking(bookingToSave: IBookingAssignment) {
    this.http.createBooking(bookingToSave).subscribe(() => {
      this.setPatientTreatmentPlan(this.currentWeek.weekNumber, this.currentWeek.year);
      this.setExpertiseOfferings(
        bookingToSave.expertiseId,
        this.currentWeek.weekNumber,
        this.currentWeek.year,
        bookingToSave.patientId
      );
    });
  }

  onDeleteBooking(deleteBookingParams: IDeleteBookingParams[]) {
    this.http.deleteBooking(deleteBookingParams).subscribe(() => {
      this.setPatientTreatmentPlan(this.currentWeek.weekNumber, this.currentWeek.year);
    });
  }

  onCreateRemark(createRemarkParams: ICreateRemarkParams) {
    const loggedInUserId = this.authenticationService.currentUserValue.id;
    const { userId, remarks } = createRemarkParams;
    const logEntryData = {
      userId,
      action: 'Create',
      tableName: 'activity_log',
      rowId: 0,
      performedByUserId: loggedInUserId,
      oldValues: null,
      newValues: null,
      remarks,
    };

    this.http.createLogEntry(logEntryData).subscribe(() => {
      this.refreshPatientDetails.emit(this.editedEntity.id);
    });
  }
  setReminder(reminder) {
    this.http.createReminder(reminder).subscribe((data) => {
      const allReminders = this.getFormattedReminders(data);
      this.editedEntity.allReminders = allReminders;
    });
  }
}
