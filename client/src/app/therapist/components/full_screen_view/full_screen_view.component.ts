import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-full-screen-view-component',
  templateUrl: './full_screen_view.component.html',
  styleUrls: ['./full_screen_view.component.scss']
})
export class FullScreenViewComponent implements OnInit, OnDestroy {

  @Input() currentUserInFullScreenMode;
  @Input() videoSessionComponents;
  @Input() connectedTherapist;
  @Input() currentStream
  @Input() localStream;
  @Input() therapistActiveCalls;
  @Output() onLeaveFullScreenModeEmitter = new EventEmitter();
  @Output() selectCurrentUserInFullScreenEmitter = new EventEmitter();

  constructor() { }

  ngOnInit() {
  }

  onLeaveFullScreenMode = () => {
    this.onLeaveFullScreenModeEmitter.emit();
  }

  selectCurrentUserInFullScreen = (conn) => {
    this.selectCurrentUserInFullScreenEmitter.emit(conn);
  }

  getCurrentStream = peer_id => {
    const currStream = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      activeCall => activeCall['call'].peer === peer_id
    );
    if (currStream) {
      return currStream.stream;
    }
  }

  getLocalStream = peer_id => {
    const currStream = this.therapistActiveCalls.find(
      // tslint:disable-next-line:no-string-literal
      activeCall => activeCall['call'].peer === peer_id
    );
    if (currStream) {
      return currStream.call.stream;
    }
  }

  ngOnDestroy() {

  }

}
