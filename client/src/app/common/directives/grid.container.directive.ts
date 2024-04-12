import { Directive, ElementRef, Input, OnChanges, OnDestroy } from '@angular/core';

@Directive({
  selector: '[css-grid-container]',
})
export class GridContainerDirective implements OnChanges, OnDestroy {
  @Input() cols: string;
  @Input() rows: string;

  constructor(private el: ElementRef) {}

  public ngOnChanges() {
    const nativeElement = this.el.nativeElement;
    this.clearStyles(nativeElement);
    nativeElement.style.setProperty('display', 'grid');
    
    if (this.cols) nativeElement.style.setProperty('grid-template-columns', this.cols);
    if (this.rows) nativeElement.style.setProperty('grid-template-rows', this.rows);
  }

  public ngOnDestroy() {
    this.clearStyles(this.el.nativeElement);
  }

  private clearStyles(el) {
    el.style.removeProperty('display');
    el.style.removeProperty('grid-template-cols');
    el.style.removeProperty('grid-template-rows');
  }
}
