import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';

@Component({
  selector: 'app-export-to-excel',
  templateUrl: './export-to-excel.component.html',
  styleUrls: ['./export-to-excel.component.scss'],
})
export class ExportToExcelComponent implements OnInit {
  @Output() excelExport = new EventEmitter();
  @Input() btnText;

  ngOnInit(): void {}
  exportToExcel = () => {
    this.excelExport.emit();
  };
}
