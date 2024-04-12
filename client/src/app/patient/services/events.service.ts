import { Injectable, EventEmitter } from "@angular/core";
import { BehaviorSubject } from "rxjs";


export class HandsEvent {
  constructor(public l_x: number, public l_y: number, public r_x: number, public r_y: number) {
  }
}

@Injectable()
export class EventsService {
  private _mouseEventSource = new BehaviorSubject<HandsEvent>({ l_x: 0, l_y: 0, r_x: 0, r_y: 0 });
  private _modalState = new BehaviorSubject<boolean>(false);
  mouseMoveEvt$ = this._mouseEventSource.asObservable();
  modalSub$ = this._modalState.asObservable();
  public mouseMove(evt: HandsEvent) {
    this._mouseEventSource.next(evt);
  }
  public ModalToggle = (newToggleState: boolean) => {
    this._modalState.next(newToggleState);
  }

}