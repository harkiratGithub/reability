import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { find } from 'lodash';

export interface IMenuOption {
  iconPath?: string;
  title: string;
  callback: () => void;
}

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss'],
})
export class SideMenuComponent implements OnInit {
  @Input() options: IMenuOption[];
  @Output() optionClicked = new EventEmitter<void>();
  withIcons = false;

  ngOnInit(): void {
    if (find(this.options, (option) => option.iconPath)) {
      this.withIcons = true;
    }
  }
  trackByMenuItem = (index: number, item: IMenuOption): string => {
    if (!item) {
      return null;
    }
    return item.title;
  };

  clicked(option: IMenuOption) {
    option?.callback();
    this.optionClicked.emit();
  }
}
