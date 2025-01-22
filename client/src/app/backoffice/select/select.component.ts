import { Component, ElementRef, Input, ViewChild, ViewChildren, forwardRef, Renderer2, QueryList } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

const MAX_ITEMS = 6;

export interface IDropItem {
  id: string;
  name: string;
}

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent {
  @Input() items;
  @Input() multiSelect;
  @ViewChild('dropdownContent', { static: false }) dropdownContent: ElementRef;
  @ViewChildren('dropdownItem') dropdownItems: QueryList<ElementRef>;
  // tslint:disable-next-line: variable-name
  _value: any;
  isOpen = false;
  disabled = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  get value() {
    return this._value;
  }

  @Input()
  set value(val) {
    this._value = val;
    this.onChange(val);
    this.onTouched();
  }

  onClickHeader() {
    this.setIsOpen(!this.isOpen);
  }

  onSelect(id) {
    if (this.multiSelect && !Array.isArray(id)) {
      if (!this.value) {
        this.value = id;
      }
      let values = this.value;
      if (Array.isArray(values[0])) {
        values.shift();
      }
      if (values.includes(id)) {
        values = values.filter((val) => val !== id);
      } else {
        values.push(id);
      }
      this.value = values;
    } else {
      this.value = id;
      this.setIsOpen(false);
    }
  }

  isThereSelecteItem() {
    if (Array.isArray(this.value) && this.value.length > 0) {
      return this.items.some((item) => this.value.includes(item.id));
    }
    return this.findElementById(this.items, this.value);
  }

  getPlaceHolderText() {
    if (Array.isArray(this.value) && this.value.length > 0) {
      return this.items
        .filter((item) => this.value.includes(item.id))
        .reduce(function (accumulator, currentValue) {
          return [...accumulator, currentValue.name];
        }, []);
    } else {
      const foundElement = this.findElementById(this.items, this.value);
      if (foundElement) {
        return foundElement.name;
      }
    }
    return 'Choose';
  }

  setIsOpen(isOpen: boolean) {
    this.isOpen = isOpen;
    if (this.isOpen) {
      this.focusLastItem();
    }
  }

  focusLastItem() {
    setTimeout(() => {
      if (this.dropdownContent && this.dropdownItems) {
        const lastItem = this.dropdownItems.last;
        if (lastItem) {
          lastItem.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
          });
        }
      }
    });
  }

  isSelected(item) {
    let selected = false;
    if (this.multiSelect) {
      selected = this.value && this.value.includes(item.id);
    } else {
      selected = this.value && item.id === this.value;
    }
    return selected;
  }

  isScrollVisible() {
    return this.items.length > MAX_ITEMS;
  }

  findElementById(items, id) {
    return items.find((item) => item.id === id);
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  writeValue(value): void {
    if (value !== this.value) {
      const foundElement = this.findElementById(this.items, value);
      this.onSelect(foundElement ? foundElement.id : value);
    }
  }
}
