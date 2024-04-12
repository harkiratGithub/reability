import { Directive, HostListener, Output, EventEmitter, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
})
export class ClickOutsideDirective {
  @Input() ignoreElement?: ElementRef;
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event', '$event.target'])
  public onClick(event, target) {
    event.stopPropagation();
    const clickedInside = this.elementRef.nativeElement.contains(target);
    const clickedIgnoredElement = this.ignoreElement?.nativeElement.contains(target);
    if (this.ignoreElement) {
      if (!clickedInside && !clickedIgnoredElement) {
        this.clickOutside.emit();
      }
    } else if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
