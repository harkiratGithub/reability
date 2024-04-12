import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  ViewChild,
  OnDestroy,
  SimpleChanges,
  SimpleChange,
  OnChanges,
  HostListener,
} from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { StreamHandlerService } from '../../services/stream_handler.service';
import moment from 'moment';
import { isBoolean } from 'lodash';

interface IDocument extends Document {
  exitPictureInPicture: () => Promise<any>;
}

@Component({
  selector: 'app-full-screen-video-session-component',
  templateUrl: './full_screen_video_session.component.html',
  styleUrls: ['./full_screen_video_session.component.scss'],
})
export class FullScreenVideoSessionComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() currSession;
  @Input() localStream;
  @Input() remoteStream;
  @Input() isTherapist;
  @Input() isVideoPaitentSession;
  @Input() remotePeerUserName;
  @Input() isTherapistScreenShared;
  @Input() isMirrorVideo;
  @Output() leaveFullScreenVideo = new EventEmitter();
  @Output() startShareScreen = new EventEmitter();
  @Output() mirrorVideo = new EventEmitter();
  @ViewChild(CdkDrag, { static: true }) cdkDrag: CdkDrag;
  @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(event: KeyboardEvent) {
    if (this.isTherapist) {
      this.onLeave();
    }
  }
  remoteVideo;
  localVideo;
  localDisaplyStream;
  isShareScreen = false;
  remoteVideoScreenShare;
  clonedStream;
  fontSize = 1;
  isVideoMirrored = false;

  constructor(private streamHandlerService: StreamHandlerService) {}

  ngAfterViewInit() {
    this.remoteVideo = document.getElementById('remote-video');
    this.localVideo = document.getElementById('local-video');
    this.remoteVideoScreenShare = document.getElementById('remote-video-share-screen');

    if (this.remoteVideo && this.localVideo) {
      if (this.localStream) {
        this.localVideo.srcObject = this.localStream;
      } else {
        this.localVideo.srcObject = this.currSession.localStream;
      }
      this.localVideo.muted = true;
      this.localVideo.onloadeddata = (e) => {
        this.localVideo.play();
      };
      if (this.isVideoPaitentSession && this.remoteStream) {
        this.remoteVideo.srcObject = this.remoteStream;
      } else {
        this.remoteVideo.srcObject = this.getRemoteStream();
      }
      if (!this.isVideoPaitentSession) {
        this.remoteVideo.muted = true;
      }
      this.remoteVideo.onloadeddata = (e) => {
        this.remoteVideo.play();
      };
    }
    if (this.isMuted()) {
      this.localVideo.srcObject = this.streamHandlerService.unMuteMicrophone(this.localVideo.srcObject);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    const isTherapistScreenShared: SimpleChange = changes.isTherapistScreenShared;
    const isMirrorVideo: SimpleChange = changes.isMirrorVideo;
    if (
      isMirrorVideo &&
      !isMirrorVideo.firstChange &&
      isMirrorVideo.previousValue !== isMirrorVideo.currentValue &&
      !this.isTherapist &&
      isBoolean(isMirrorVideo.currentValue)
    ) {
      this.handleVideoMirror();
    }
    if (
      isTherapistScreenShared &&
      !isTherapistScreenShared.firstChange &&
      isTherapistScreenShared.previousValue !== isTherapistScreenShared.currentValue &&
      !this.isTherapist &&
      isTherapistScreenShared.currentValue
    ) {
      let stream1 = new MediaStream();
      if (this.remoteStream) {
        stream1.addTrack(this.remoteStream.getVideoTracks()[0]);
      } else {
        const videoTrack = this.getVideoTrack();
        stream1.addTrack(videoTrack);
      }
      this.setPictureInPicture();
      this.remoteVideoScreenShare.srcObject = stream1;

      let stream2 = new MediaStream();
      if (this.remoteStream) {
        stream2.addTrack(this.remoteStream.getVideoTracks()[1]);
        stream2.addTrack(this.remoteStream.getAudioTracks()[0]);
      } else {
        const sharedVideoTrack = this.getVideoTrack(true);
        stream2.addTrack(sharedVideoTrack);
        stream2.addTrack(this.remoteVideo.srcObject.getAudioTracks()[0]);
      }
      this.clonedStream = this.remoteVideo.srcObject.clone();
      this.remoteVideo.srcObject = stream2;
      this.localVideo.style.setProperty('transform', 'unset');
      this.remoteVideo.style.setProperty('transform', 'unset');
    } else if (
      isTherapistScreenShared &&
      !isTherapistScreenShared.firstChange &&
      isTherapistScreenShared.previousValue !== isTherapistScreenShared.currentValue &&
      !this.isTherapist &&
      !isTherapistScreenShared.currentValue
    ) {
      this.remoteVideo.srcObject = this.clonedStream;
    }
  }

  getVideoTrack = (shared = false) => {
    const remoteStream = this.currSession.call ? this.currSession.stream.clone() : this.currSession.remoteStream;
    if (!shared) {
      if (this.isIosDevice()) {
        return remoteStream.getVideoTracks().find((track) => track.getSettings().width === 640);
      } else {
        return remoteStream.getVideoTracks()[0];
      }
    } else {
      if (this.isIosDevice()) {
        return remoteStream
          .getVideoTracks()
          .find((track) => track.getSettings().id !== this.remoteVideoScreenShare.srcObject.getVideoTracks()[0].id);
      } else {
        return remoteStream.getVideoTracks()[1];
      }
    }
  };

  getRemoteStream = () => {
    const remoteStream = this.currSession.call
      ? this.currSession.stream.clone()
      : this.currSession.remoteStream.clone();
    if (this.isIosDevice()) {
      let stream = new MediaStream();
      stream.addTrack(remoteStream.getVideoTracks().find((track) => track.getSettings().width !== 0));
      stream.addTrack(remoteStream.getAudioTracks()[0]);

      return stream;
    } else {
      return remoteStream;
    }
  };

  isIosDevice = () => {
    return ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
  };

  onLeave = () => {
    if (this.isShareScreen) {
      this.toggleShareScreenView();
    }
    this.leaveFullScreenVideo.emit();
  };

  reset() {
    this.cdkDrag._dragRef['_previewRect'] = undefined;
    this.cdkDrag._dragRef['_boundaryRect'] = undefined;
  }

  muteMicrophone = () => {
    let stream = this.localVideo.srcObject;
    if (stream) {
      if (stream.getAudioTracks()[0].enabled) {
        stream = this.streamHandlerService.muteMicrophone(stream);
      } else {
        stream = this.streamHandlerService.unMuteMicrophone(stream);
      }
    }
  };

  isMuted = () => {
    if (this.localVideo) {
      let stream = this.localVideo.srcObject;
      if (stream) {
        return !stream.getAudioTracks()[0].enabled;
      }
    }
    return null;
  };

  toggleShareScreenView = () => {
    this.isShareScreen = !this.isShareScreen;
    this.setPictureInPicture();
    if (!this.isShareScreen) {
      this.startShareScreen.emit(this.isShareScreen);
    }
    this.toggleScreenStream();
  };

  toggleScreenStream = async () => {
    let videoTrack;
    const sender = this.currSession.call.peerConnection.getSenders()[2];
    if (this.isShareScreen) {
      this.localDisaplyStream = await this.startCapture({
        video: {
          cursor: 'always',
        },
      });
      this.localDisaplyStream.getVideoTracks()[0].addEventListener('ended', () => this.toggleShareScreenView());
      videoTrack = this.localDisaplyStream.getVideoTracks()[0];
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
      this.startShareScreen.emit(this.isShareScreen);
    } else if (this.localDisaplyStream) {
      this.localDisaplyStream.getTracks().forEach((track) => track.stop());
    }
  };

  setPictureInPicture = () => {
    if (this.isShareScreen || this.isTherapistScreenShared) {
      this.remoteVideo
        .requestPictureInPicture()
        .then()
        .catch((error) => {
          console.log(error);
        });
    } else {
      (document as IDocument)
        .exitPictureInPicture()
        .then()
        .catch((error) => {
          console.log(error);
        });
    }
  };

  startCapture = async (displayMediaOptions) => {
    let captureStream = null;

    try {
      captureStream = await navigator.mediaDevices['getDisplayMedia'](displayMediaOptions);
    } catch (err) {
      console.error('Error: ' + err);
    }
    return captureStream;
  };

  shouldShowRemoteVideoOnShareScreen = () => {
    if ((this.isTherapist && this.isShareScreen) || this.isTherapistScreenShared) {
      this.handleRemotePeerStreamOnShareScreen();
      return true;
    }
    return false;
  };

  handleRemotePeerStreamOnShareScreen = () => {
    if (!this.remoteVideoScreenShare.srcObject) this.remoteVideoScreenShare.srcObject = this.remoteVideo.srcObject;
  };

  setScaleOfRemoteScreenShare = () => {
    if (!this.isTherapist && this.isTherapistScreenShared && this.remoteVideo && this.remoteVideo.videoWidth) {
      const videoWidth = this.remoteVideo.videoWidth;
      const videoHeight = this.remoteVideo.videoHeight;
      const scaleX = videoWidth / window.innerWidth;
      const scaleY = videoHeight / window.innerHeight;
      const scale = Math.min(scaleX, scaleY);
      return {
        width: `calc(100%)`,
      };
    }
  };

  styleObject = () => {
    const root = document.documentElement;
    root.style.setProperty('--my-background-size-var', this.fontSize + 'rem');
    root.style.setProperty('--my-background-position-var', `calc(50% - ${this.fontSize}rem * 4) 50%`);
    return {
      fontSize: this.fontSize + 'rem',
    };
  };

  handleVideoMirror = () => {
    this.isVideoMirrored = !this.isVideoMirrored;
    if (this.isVideoMirrored) {
      this.localVideo.style.setProperty('transform', 'scaleX(-1)');
      this.remoteVideo.style.setProperty('transform', 'scaleX(-1)');
    } else {
      this.localVideo.style.setProperty('transform', 'unset');
      this.remoteVideo.style.setProperty('transform', 'unset');
    }
    if (this.isTherapist && !this.isShareScreen) {
      this.mirrorVideo.emit(this.isVideoMirrored);
    }
  };

  ngOnDestroy() {
    if (this.localVideo && this.isTherapist && this.isVideoPaitentSession) {
      this.localVideo.pause();
      this.localVideo.srcObject.getTracks().forEach((track) => track.stop());
      this.localVideo.src = null;
    }
    // if (this.remoteVideo) {
    //   this.remoteVideo.pause();
    //   this.remoteVideo.src = null;
    // }
  }
}
