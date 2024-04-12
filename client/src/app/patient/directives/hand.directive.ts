import { Directive, ElementRef, EventEmitter, Input, Output, AfterViewInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { EventsService, HandsEvent } from '../services/events.service';

@Directive({
  selector: '[appHand]',
})
export class HandDirective implements AfterViewInit, OnDestroy {
  @Input() timeToWait: number;
  @Input() hoverClass: string;
  @Input() selectable: boolean;
  @Input() isInModal: boolean;
  @Input() activeOnStartHover;
  @Input() activeOnOutHover;
  @Input() delayAnimation;
  @Input() clickOnlyOnCenter: boolean = false;
  @Output() outputFunc = new EventEmitter<any>();

  top = 0;
  bottom = 0;
  left = 0;
  right = 0;
  MENU_OPTION_WIDTH = 112; // 14rem

  mouseEventSub: Subscription;
  funcFlag = false;
  hoverTimeoutId: any;

  SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE = 0.4;
  HAND_VW = 0.04;

  constructor(private el: ElementRef, private eventsService: EventsService) {}

  ngAfterViewInit() {
    this.mouseSubscription();
    const delayFunc = () => this.getElementDimensions();
    if (this.delayAnimation) {
      setTimeout(() => delayFunc(), this.delayAnimation);
    } else {
      delayFunc();
    }
  }

  ngOnDestroy() {
    this.mouseEventSub.unsubscribe();
  }

  getElementDimensions() {
    const boundingRect = this.el.nativeElement.getBoundingClientRect();
    (this.top = boundingRect.top),
      (this.bottom = boundingRect.bottom),
      (this.left = boundingRect.left),
      (this.right = boundingRect.right);
  }

  checkIfMouseOnElement(evt: HandsEvent) {
    if (this.clickOnlyOnCenter) {
      return (
        this.isHandCenterInsideElement(evt.l_x, evt.l_y, evt) || this.isHandCenterInsideElement(evt.r_x, evt.r_y, evt)
      );
    }
    return (
      (evt.l_x > this.left && evt.l_x < this.right && evt.l_y > this.top && evt.l_y < this.bottom) ||
      (evt.r_x > this.left && evt.r_x < this.right && evt.r_y > this.top && evt.r_y < this.bottom)
    );
  }

  isHandCenterInsideElement(handX: number, handY: number, evt: HandsEvent): boolean {
    const addToGetToCenterOfTheHand = (window.innerWidth * this.HAND_VW) / 2;
    const middleX = (this.right - this.left) / 2;
    const middleY = (this.bottom - this.top) / 2;

    if (middleX == 0 && middleY == 0) {
      return false;
    }

    if (middleX == 0) {
      const currentRight = this.right + this.MENU_OPTION_WIDTH;
      const currentMiddleX = this.MENU_OPTION_WIDTH / 2;
      return (
        handX + addToGetToCenterOfTheHand >
          this.left + currentMiddleX * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE &&
        handX + addToGetToCenterOfTheHand <
          currentRight - currentMiddleX * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE &&
        handY + addToGetToCenterOfTheHand > this.top + middleY * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE &&
        handY + addToGetToCenterOfTheHand < this.bottom - middleY * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE
      );
    }

    return (
      handX + addToGetToCenterOfTheHand > this.left + middleX * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE &&
      handX + addToGetToCenterOfTheHand < this.right - middleX * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE &&
      handY + addToGetToCenterOfTheHand > this.top + middleY * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE &&
      handY + addToGetToCenterOfTheHand < this.bottom - middleY * this.SELECTION_DISTANCE_FROM_CENTER_OERCENTAGE
    );
  }

  mouseSubscription() {
    this.mouseEventSub = this.eventsService.mouseMoveEvt$.subscribe((evt) => {
      if (this.checkIfMouseOnElement(evt)) {
        this.onEnterElement();
      } else {
        this.onLeaveElement();
      }
    });
  }

  onEnterElement() {
    if (this.activeOnStartHover) {
      this.activeOnStartHover();
    }
    if (this.selectable) {
      this.el.nativeElement.classList.add(this.hoverClass);
    }
    if (!this.hoverTimeoutId) {
      this.hoverTimeoutId = setTimeout(() => {
        if (this.funcFlag) {
          this.onClick();
        }
      }, this.timeToWait);
    }
    this.funcFlag = true;
  }

  onLeaveElement() {
    if (this.activeOnOutHover) {
      this.activeOnOutHover();
    }
    if (this.hoverClass && this.el.nativeElement.classList.contains(this.hoverClass)) {
      this.el.nativeElement.classList.remove(this.hoverClass);
    }
    if (this.hoverTimeoutId) {
      clearTimeout(this.hoverTimeoutId);
      this.hoverTimeoutId = null;
    }
    this.funcFlag = false;
  }

  onClick(event?) {
    this.outputFunc.emit();
    this.onLeaveElement();
  }
}
