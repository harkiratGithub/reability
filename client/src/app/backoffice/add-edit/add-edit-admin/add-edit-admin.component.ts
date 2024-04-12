import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-add-edit-admin',
  templateUrl: './add-edit-admin.component.html',
  styleUrls: ['./add-edit-admin.component.scss'],
})
export class AddEditAdminComponent implements OnInit, OnDestroy {
  @Input() editedEntity;
  @Output() valid = new EventEmitter<any>();
  @Output() state = new EventEmitter<any>();

  subscription: Subscription = new Subscription();
  customForm: FormGroup;

  ngOnInit() {
    this.customForm = new FormGroup({
      first_name: new FormControl(this.getDefaultValue(this.editedEntity, 'first_name')),
      last_name: new FormControl(this.getDefaultValue(this.editedEntity, 'last_name')),
      username: new FormControl(this.getDefaultValue(this.editedEntity, 'user_name')),
      email: new FormControl(this.getDefaultValue(this.editedEntity, 'email')),
      phone: new FormControl(this.getDefaultValue(this.editedEntity, 'phone')),
    });

    this.onChanges();
    (window as any).form = this.customForm;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  getDefaultValue(editedEntity, fieldName) {
    return (editedEntity && editedEntity[fieldName]) || '';
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
  }
}
