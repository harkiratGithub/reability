import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import _, { forEach, isEqual } from 'lodash';

import { TechIssueValues } from '../../../constants';
import { IAssignment, IPatient, IPatientBooking } from '../../../types';
import { IMenuOption } from '../side-menu/side-menu.component';
import { isMobileDevice } from '../utils';

@Component({
  selector: 'app-calendar-item-modal',
  templateUrl: './calendar-item-modal.component.html',
  styleUrls: ['./calendar-item-modal.component.scss'],
})
export class CalendarItemModalComponent {
  sideMenuShown = false;
  isMobile = isMobileDevice();
  techReason: string;
  currentPatientIdInEdit: number;

  @Input() coPatients?: IAssignment[];
  @Input() patientBooking?: IPatientBooking;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() headerTitle?: string;
  @Input() sideMenuOptions: IMenuOption[] = [];
  @Input() coPatientPersonalMenuOptions: IMenuOption[] = [];
  @Input() deleteAction: IMenuOption;
  @Output() onClose = new EventEmitter<void>();
  @Output() onSelectedCoPatient = new EventEmitter<IAssignment>();
  @Output() onReasonSave = new EventEmitter<IPatient>();
  @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
    this.onClose.emit();
  }

  toggleSideMenuShown = () => {
    this.sideMenuShown = !this.sideMenuShown;
  };

  editPatient = (patient: IAssignment) => (this.currentPatientIdInEdit = patient.patientId);

  onPressClose = () => {
    this.onClose.emit();
  };

  isTechIssue = (value: TechIssueValues): boolean => value !== TechIssueValues.empty;

  onCoPatientPersonalMenuClick = (coPatientPressed: IAssignment): void => {
    this.onSelectedCoPatient.emit(coPatientPressed);
    forEach(this.coPatients, (coPatient) => {
      coPatient.selected = !coPatient.selected && isEqual(coPatient, coPatientPressed);
    });
  };
  resetPatientSelection = (patient: IAssignment) => {
    patient.selected = false;
  };
  saveReason = (patient: IAssignment) => {
    const updatePatient = { id: patient.patientId, techReason: this.techReason };
    patient.techReason = this.techReason;
    this.onReasonSave.emit(updatePatient);
    this.currentPatientIdInEdit = null;
    this.techReason = '';
  };
}
