import { Component, Input } from '@angular/core';
import { isEmpty, upperFirst } from 'lodash';

import { IBackOfficeTabAction } from '../../../types';
import { FIELDS_NOT_TO_CAPITALIZE } from '../backoffice-constants';

const TOOLTIP_HEIGHT = 130; // actually 122, taking a little offset

export interface ITableColumn {
  fieldName?: string;
  displayName?: string;
  flex?: number;
  datePipe?: boolean;
  width?: string;
  cellType?: CellType;
  onClick?: (row: any) => void;
}

export enum CellType {
  img,
  email,
  copyToClip,
}
@Component({
  selector: 'app-backoffice-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent {
  @Input() columns: ITableColumn[];
  @Input() rows;
  @Input() currentTabIndex;
  @Input() additionalActions: IBackOfficeTabAction[];

  cellType = CellType;

  getCell(row, col: ITableColumn) {
    const { fieldName } = col;
    const displayText = !isEmpty(row[fieldName]) ? row[fieldName] : '';
    if (FIELDS_NOT_TO_CAPITALIZE.includes(fieldName)) {
      return displayText;
    }
    return upperFirst(displayText);
  }

  getImageSrc(row, col) {
    const imgSrc = this.getCell(row, col);
    return imgSrc;
  }

  trackByIndex = (index: number): number => {
    return index;
  };

  copyURI(event, data) {
    event.preventDefault();
    navigator.clipboard.writeText(data);
  }
}
