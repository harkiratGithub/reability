import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-calendar-management-dialog',
  templateUrl: './calendar-management-dialog.component.html',
  styleUrls: ['./calendar-management-dialog.component.scss'],
})
export class CalendarManagementDialogComponent implements OnInit {
  response = { isThisWeek: false, isAllWeeks: false };
  constructor(public dialogRef: MatDialogRef<CalendarManagementDialogComponent>) {}

  ngOnInit(): void {}
  
  onCancelClick(): void {
    this.dialogRef.close();
  }
}
