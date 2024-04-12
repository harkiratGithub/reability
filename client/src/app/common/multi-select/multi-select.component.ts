import { Component, ElementRef, EventEmitter, Input, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import { forEach, uniqueId, filter, isEmpty, clone, find, sortBy } from 'lodash';
import { IMultiSelectOptions } from '../../../types';

@Component({
  selector: 'app-multi-select',
  templateUrl: './multi-select.component.html',
  styleUrls: ['./multi-select.component.scss'],
})
export class MultiSelectComponent implements OnInit {
  @Input() options: IMultiSelectOptions[];
  @Input() selected: IMultiSelectOptions[];
  @Input() rotateOnClick = true;
  @Input() isSingleSelect = false;
  @Input() sharedFilter;
  @Output() submit = new EventEmitter<IMultiSelectOptions[]>();
  @ViewChildren('checkboxes') checkboxes: QueryList<ElementRef>;
  uniqId = uniqueId();
  isDropdownOpen = false;
  localSelection: IMultiSelectOptions[] = [];
  isToggleAllChecked;

  ngOnInit(): void {
    this.options = sortBy(this.options, 'displayName');
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen === true) {
      setTimeout(() => {
        // wait for dropdown to appear
        this.localSelection = this.isDropdownOpen ? clone(this.selected) : [];
        this.toggleSelectedOn();
      }, 0);
    }
  }

  toggleSelection(selectedOption) {
    if (this.isSingleSelect) {
      if (isEmpty(this.localSelection) || this.localSelection[0] !== selectedOption) {
        this.localSelection = [selectedOption];
      } else {
        this.localSelection = [];
      }
      this.toggleSelectedOn();
      return;
    }
    const indexOfObject = this.localSelection.indexOf(selectedOption);
    if (indexOfObject === -1) {
      this.localSelection.push(selectedOption);
    } else {
      this.localSelection.splice(indexOfObject, 1);
    }
    this.updateToggleAll();
  }
  toggleAll(event: Event) {
    const checkboxStatus = (event.target as HTMLInputElement).checked;
    this.checkboxes.forEach((element) => {
      element.nativeElement.checked = checkboxStatus;
    });
    this.localSelection = checkboxStatus ? [...this.options] : [];
  }
  updateToggleAll() {
    this.isToggleAllChecked = this.options.length === this.localSelection.length;
  }
  submitSelection() {
    this.submit.emit(this.localSelection);
    this.toggleDropdown();
  }
  toggleSelectedOn() {
    this.checkboxes.forEach((element) => {
      element.nativeElement.checked = !!find(this.localSelection, (ls) => ls.displayName === element.nativeElement.id);
    });
  }
}
