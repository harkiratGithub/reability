import { Subscription } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { InnerModalInterface } from '../../general-modal/general-modal.component';
import { ThemePalette } from '@angular/material/core';
import moment from 'moment';

@Component({
  selector: 'app-show-rtm-modal',
  templateUrl: './show-rtm-modal.component.html',
  styleUrls: ['./show-rtm-modal.component.scss'],
})
export class ShowRTMModalComponent implements OnInit {
  @Output() returnedData = new EventEmitter<InnerModalInterface>();
  @Input() patient;
  @Input() rows: any[] = [];
  @Input() columns: any[] = [
    { field: 'date', header: 'Date' },
    { field: 'activity', header: 'Activity' },
    { field: 'timeSpent', header: 'Time Spent' },
    { field: 'note', header: 'Note' },
  ];

  constructor() {}

  ngOnInit(): void {
    console.log('Modal Rows:', this.rows);
    console.log('Modal Columns:', this.columns);
  }
}
