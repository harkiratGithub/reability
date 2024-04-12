import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface ILead {
  id?: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  reminder?: string;
  allReminders?: IReminder[];
}

interface IReminder {
  id?: number;
  performed_by_user_id?: number;
  admin_first_name?: string;
  admin_last_name?: string;
  lead_id?: number;
  reminder: string;
  created_at?: any;
}

@Component({
  selector: 'app-add-edit-lead',
  templateUrl: './add-edit-lead.component.html',
  styleUrls: ['./add-edit-lead.component.scss'],
})
export class AddEditLeadComponent implements OnInit {
  @Input() lead;
  @Output() valid = new EventEmitter<any>();
  @Output() state = new EventEmitter<any>();
  @Output() reminder = new EventEmitter<any>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;
  currentReminder = '';

  ngOnInit() {}

  ngOnChanges(changes) {
    if (changes.lead) {
      this.customForm = new FormGroup({
        first_name: new FormControl(this.getDefaultValue(this.lead, 'first_name')),
        last_name: new FormControl(this.getDefaultValue(this.lead, 'last_name')),
        email: new FormControl(this.getDefaultValue(this.lead, 'email'), Validators.email),
        phone: new FormControl(this.getDefaultValue(this.lead, 'phone'), Validators.required),
        referral: new FormControl(this.getDefaultValue(this.lead, 'referral')),
        reminder: new FormControl(),
        contact_full_name: new FormControl(this.getDefaultValue(this.lead, 'contact_full_name')),
        contact_phone: new FormControl(this.getDefaultValue(this.lead, 'contact_phone')),
        contact_email: new FormControl(this.getDefaultValue(this.lead, 'contact_email')),
      });

      this.onChanges();
      (window as any).form = this.customForm;
    }
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getDefaultValue(lead, fieldName) {
    return lead?.[fieldName] || '';
  }

  onChanges() {
    this.subscription.add(
      this.customForm.statusChanges.subscribe((status) => {
        this.valid.emit(status === 'VALID');
      })
    );
    this.subscription.add(
      this.customForm.valueChanges.subscribe((state) => {
        if (this.lead) {
          const { reminder, ...stateWithoutReminder } = state;
          this.state.emit(stateWithoutReminder);
        } else {
          this.state.emit(state);
        }
      })
    );
  }

  addReminder(reminder) {
    this.reminder.emit({ lead_id: this.lead.id, reminder });
    this.currentReminder = '';
  }
}
