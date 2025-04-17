import { environment } from '../../../../environments/environment';
import { Component, OnInit, OnDestroy } from '@angular/core';
import Peer from 'peerjs';
import { AuthenticationService } from 'src/app/common/services/authentication.service';
import { Subscription } from 'rxjs';
import { AppActions } from 'src/app/app.actions';
import { VIDEO_PATIENT_MESSAGES, CHECK_PEER_STATUS_AFTER_ERROR_TIME } from '../../../../constants';
import { Router } from '@angular/router';
import { StreamHandlerService } from 'src/app/therapist/services/stream_handler.service';
import { AjaxService } from 'src/app/therapist/services/ajax.service';
@Component({
  selector: 'app-psyc-session',
  templateUrl: './psychology_session.component.html',
  styleUrls: ['./psychology_session.component.scss'],
})
export class VideoPatientComponent implements OnInit, OnDestroy {
  currentUserSubscription: Subscription;
  currentUser;
  patientPeer;
  therapistToPatientConnection;
  currentCall;
  patientPing;
  mediaStreamConstraints = {
    video: true,
    audio: true,
  };
  localVideo;
  localStream;
  remoteDisaplyStream;
  remoteStream;
  remoteVideo;
  receivedRemoteVideo;
  fullScreenVideoSessionDisplay = false;
  runClock;
  message_content = VIDEO_PATIENT_MESSAGES.message_content;
  message_header = VIDEO_PATIENT_MESSAGES.message_header;
  spinner_text = VIDEO_PATIENT_MESSAGES.spinner_text;
  spinner_text_mobile = VIDEO_PATIENT_MESSAGES.spinner_text_mobile;
  no_camera_connection = VIDEO_PATIENT_MESSAGES.no_camera_connection;
  iceServers;
  mediaConnectionInterval;
  isModalOpen = false;
  isShareScreen = false;
  peerHasErrors = false;

  constructor(
    private authenticationService: AuthenticationService,
    private ajaxService: AjaxService,
    private appActions: AppActions,
    private streamHandlerService: StreamHandlerService,
    private router: Router
  ) {
    this.currentUserSubscription = this.authenticationService.currentUser.subscribe((user) => {
      this.currentUser = user;
    });
    this.ajaxService.getIceServers().subscribe((res) => {
      this.iceServers = res;
      this.startSession();
    });
  }

  ngOnInit() {
    // this.openFullscreen();
    this.localVideo = document.getElementById('patient-video');
    this.prepareLocalRTCSpecs();
  }

  openFullscreen = () => {
    const docElem = document.documentElement;
    if (docElem.requestFullscreen) {
      docElem.requestFullscreen();
    } else if ((docElem as any).webkitRequestFullscreen) {
      (docElem as any).webkitRequestFullscreen();
    }
  };

  /*prepareLocalRTCSpecs() {
    if (this.hasUserMedia()) {
      navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints).then(
        (stream) => {
          this.localVideo = document.getElementById('patient-video');
          this.localStream = stream;
          if (this.localStream.getAudioTracks()[0].muted) {
            this.handleMicMute();
          }
          this.monitorMicAudio();
          this.localVideo.srcObject = stream;
          this.localVideo.muted = true;
          this.localVideo.onloadeddata = (e) => {
            this.localVideo.play();
          };
        },
        (err) => {
          console.warn('error displaying webrtc: ', err);
        }
      );
    } else {
      alert('WebRTC is not supported');
    }
  }*/

  prepareLocalRTCSpecs() {
    if (this.hasUserMedia()) {
      navigator.mediaDevices.getUserMedia(this.mediaStreamConstraints).then(
        (stream) => {
          this.localVideo = document.getElementById('patient-video') as HTMLVideoElement;
          this.localStream = stream;
          if (this.localStream.getAudioTracks()[0]?.muted) {
            this.handleMicMute();
          }
          this.monitorMicAudio();
          this.localVideo.srcObject = stream;
          this.localVideo.muted = true;
          this.localVideo.onloadeddata = () => {
            this.localVideo.play();
          };
        },
        (err) => {
          console.warn('Error displaying WebRTC: ', err);
        }
      );
    } else {
      alert('WebRTC is not supported');
    }
  }


  hasUserMedia() {
    //return navigator.getUserMedia;
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  startSession() {
    this.patientPeer = new Peer(this.currentUser.peerId, {
      host: environment.signalingServer,
      port: environment.signalingServerPort,
      path: `/api`,
      debug: 3,
      key: environment.secretKey,
      config: {
        iceServers: [...this.iceServers.iceServers],
        iceTransportPolicy: this.iceServers.onlyTcp ? 'relay' : 'all',
      },
      secure: true,
    });

    this.patientPeer.on('open', (id) => {
      console.log('therapist connection opened! waiting for peer to connect... and id is', id);
      this.peerHasErrors = false;
    });

    this.patientPeer.on('error', (err) => {
      console.warn('therapist peer error' + err);
      if (err.message && err.message.includes('Lost connection to server')) {
        if (!this.peerHasErrors) {
          this.peerHasErrors = true;
          setTimeout(this.checkPeerStatusAndHandlePeerError, CHECK_PEER_STATUS_AFTER_ERROR_TIME);
        }
      } else if (err.message.includes('taken')) {
        this.ajaxService.disconnectConnectedPeers(this.currentUser.peerId);
        setTimeout(() => {
          this.startSession();
        }, 2000);
      }
      this.fullScreenVideoSessionDisplay = false;
    });
    this.patientPeer.on('kill_connection', (msg) => {
      this.patientPeer.destroy();
    });
    this.patientPeer.on('connection', (connection) => {
      this.peerHasErrors = false;
      this.therapistToPatientConnection = connection;
      // Use the handleMessage to callback when a message comes in
      this.therapistToPatientConnection.on('data', (data) => {
        this.handleMessage(data);
      });
    });

    this.patientPeer.on('call', (call) => {
      this.currentCall = call;
      this.playCallAudio();
      this.handleMicUnmute();
      setTimeout(() => {
        this.openModal(`New video call incoming from ${call.metadata}`, call);
      }, 0);
    });
    this.patientPing = setInterval(() => {
      this.patientPeer.socket._sendHeartbeat();
    }, 30 * 1000);
    this.patientPeer.on('close', () => {
      clearInterval(this.patientPing);
    });
    const self = this;
    this.patientPeer.on('disconnected', () => {
      const interval = setInterval(function () {
        if (self.patientPeer.open === true || self.patientPeer.destroyed === true) {
          clearInterval(interval);
        } else {
          if (self.patientPeer.reconnect()) {
            console.log('connection established after reconnection');
            this.peerHasErrors = false;
          } else {
            console.log('trying to reconnect');
          }
        }
      }, 1000);
    });
  }

  checkPeerStatusAndHandlePeerError = () => {
    if (this.peerHasErrors) {
      this.handleConnetionErrorToSignalingServer();
    }
  };

  handleMessage = (data) => {
    switch (data.type) {
      case 'send_game_url':
        this.therapistToPatientConnection.send({ type: 'game_url', payload: { url: 'video-patient' } });
        break;
      case 'enter_full_screen_video_session':
        // this.fullScreenVideoSessionDisplay = true;
        break;
      case 'therapist_left_video_session':
        this.handleCloseVideoSession();
        this.receivedRemoteVideo = false;
        break;
      case 'screen_share_started':
        this.isShareScreen = true;
        break;
      case 'screen_share_stopped':
        this.isShareScreen = false;
        break;
      case 'hang_up_session':
        if (this.fullScreenVideoSessionDisplay) {
          this.handleCloseVideoSession();
        }
        this.localStream = this.streamHandlerService.unMuteMicrophone(this.localStream);
        this.receivedRemoteVideo = false;
        break;
      default:
        break;
    }
  };

  handleCloseVideoSession = () => {
    this.fullScreenVideoSessionDisplay = false;
  };

  openModal = (content, call) => {
    this.appActions.openCallModal({
      header: 'CONNECTION REQUEST',
      content,
      acceptBtnImg: '../../../assets/modal/btn_hover_request_timer.png',
      acceptBtnImgHover: '../../../assets/modal/btn_accept_hover.png',
      approveCallback: () => this.approveCallback(call),
      declineCallback: () => this.declineCallback(),
    });
  };

  approveCallback = (call) => {
    this.stopCallAudio();
    call.answer(this.localStream);
    if (this.isIosDevice()) {
      call.peerConnection.addEventListener('track', (event) => {
        // other pc track
        if (!this.receivedRemoteVideo) {
          this.receivedRemoteVideo = true;
          this.gotRemoteMediaStream(event.streams[0]);
        }
      });
    } else {
      call.on('stream', (stream) => {
        if (!this.receivedRemoteVideo) {
          this.receivedRemoteVideo = true;
          this.gotRemoteMediaStream(stream);
        }
      });
    }
    call.on('close', () => {
      if (this.fullScreenVideoSessionDisplay) {
        this.handleCloseVideoSession();
        this.receivedRemoteVideo = false;
      }
      this.localStream = this.streamHandlerService.unMuteMicrophone(this.localStream);
      this.receivedRemoteVideo = false;
    });
    call.on('error', (e) => {
      console.warn('connection error ', e);
      this.handleCloseVideoSession();
      this.receivedRemoteVideo = false;
    });
  };

  playCallAudio = () => {
    const callAudio = document.getElementById('call-audio') as HTMLAudioElement;
    if (callAudio) {
      callAudio.play();
      callAudio.loop = true;
    }
  };

  stopCallAudio = () => {
    const callAudio = document.getElementById('call-audio') as HTMLAudioElement;
    if (callAudio) {
      callAudio.pause();
      callAudio.loop = false;
    }
  };

  declineCallback = () => {
    this.stopCallAudio();
    // this.patientWebRtcService.setShouldPauseGameState(false);
  };

  toggleVideoSessionView = () => {
    this.fullScreenVideoSessionDisplay = !this.fullScreenVideoSessionDisplay;
  };

  gotRemoteMediaStream = (mediaStream) => {
    this.remoteStream = mediaStream;
    this.remoteStream = this.streamHandlerService.unMuteMicrophone(this.remoteStream);
    let mediaStreamVideoTracks = mediaStream.getVideoTracks();
    if (this.isIosDevice()) {
      setTimeout(() => {
        const timer = setInterval(() => {
          if (mediaStreamVideoTracks.find((track) => track.getSettings().width !== 0)) {
            this.handleStreamReady(mediaStreamVideoTracks, mediaStream);
            clearInterval(timer);
          }
        }, 500);
      }, 2000);
    } else {
      const videoWrapper = document.getElementById('web-rtc-wrapper');
      if (this.remoteVideo && videoWrapper) {
        videoWrapper.removeChild(this.remoteVideo);
        this.remoteVideo = null;
      }
      this.remoteVideo = document.createElement('video');
      if (videoWrapper) {
        videoWrapper.appendChild(this.remoteVideo);
      }
      let stream = new MediaStream();
      stream.addTrack(mediaStreamVideoTracks[0]);
      stream.addTrack(mediaStreamVideoTracks[1]);
      stream.addTrack(mediaStream.getAudioTracks()[0]);
      if ('srcObject' in this.remoteVideo) {
        //this.remoteVideo.srcObject = stream;
        (this.remoteVideo as any).srcObject = stream;
      } else if (navigator['mozGetUserMedia']) {
        (this.remoteVideo as any).mozSrcObject = stream;
      } else {
        // (this.remoteVideo as any).src = (window.URL || window.webkitURL).createObjectURL(stream);
        (this.remoteVideo as any).srcObject = stream;
      }

      this.remoteVideo.id = 'therapist-video';
      this.remoteVideo.muted = true;
      this.remoteVideo.setAttribute('playsinline', 'true');
      this.remoteVideo.setAttribute('autoplay', 'true');
      this.remoteVideo.classList.add('therapist-video');
      this.remoteVideo.onloadeddata = (e) => {
        this.remoteVideo.play();
      };
    }
    this.fullScreenVideoSessionDisplay = true;
  };

  arrayRotate = (arr, reverse) => {
    if (reverse) arr.unshift(arr.pop());
    else arr.push(arr.shift());
    return arr;
  };

  handleStreamReady = (mediaStreamVideoTracks, mediaStream) => {
    if (mediaStreamVideoTracks[1].getSettings().width !== 0) {
      mediaStreamVideoTracks = this.arrayRotate(mediaStreamVideoTracks, true);
    }
    let stream = new MediaStream();
    stream.addTrack(mediaStreamVideoTracks[0]);
    stream.addTrack(mediaStream.getAudioTracks()[0]);
    const videoWrapper = document.getElementById('web-rtc-wrapper');
    if (this.remoteVideo && videoWrapper) {
      videoWrapper.removeChild(this.remoteVideo);
      this.remoteVideo = null;
    }
    this.remoteVideo = document.createElement('video');
    if (videoWrapper) {
      videoWrapper.appendChild(this.remoteVideo);
    }

    if ('srcObject' in this.remoteVideo) {
      // this.remoteVideo.srcObject = stream;
      (this.remoteVideo as any).srcObject = stream;
    } else if (navigator['mozGetUserMedia']) {
      (this.remoteVideo as any).mozSrcObject = stream;
    } else {
      //(this.remoteVideo as any).src = (window.URL || window.webkitURL).createObjectURL(stream);
      (this.remoteVideo as any).srcObject = stream;
    }

    this.remoteVideo.id = 'therapist-video';
    this.remoteVideo.setAttribute('playsinline', 'true');
    this.remoteVideo.setAttribute('autoplay', 'true');
    this.remoteVideo.muted = true;
    this.remoteVideo.classList.add('therapist-video');
    this.remoteVideo.onloadeddata = (e) => {
      this.remoteVideo.play();
      setTimeout(() => {
        this.remoteVideo.pause();
        this.remoteVideo.play();
      }, 1000);
    };
  };

  closeVideoStream = () => {
    if (this.localVideo) {
      this.localVideo.pause();
      this.localVideo.src = null;
    }
    this.localStream.getTracks().forEach((track) => track.stop());
  };

  logout = async () => {
    await this.authenticationService.logout();
    this.appActions.setLoggedInUser(false);
    this.ngOnDestroy();
  };

  getTherapistUser = () => {
    return this.currentCall.metadata;
  };

  monitorMicAudio = () => {
    this.localStream.getAudioTracks()[0].onmute = (evt) => {
      if (!this.fullScreenVideoSessionDisplay) {
        this.handleMicMute();
      }
    };
    this.localStream.getAudioTracks()[0].onunmute = (evt) => {
      if (!this.fullScreenVideoSessionDisplay) {
        this.handleMicUnmute();
      }
    };
  };

  handleMicMute = () => {
    if (!this.isModalOpen) {
      this.isModalOpen = true;
      this.appActions.openMutedMicModal({
        header: VIDEO_PATIENT_MESSAGES.muted_mic_header,
        content: VIDEO_PATIENT_MESSAGES.muted_mic_message,
        acceptBtnImg: '../../../assets/modal/btn_hover_request_timer.png',
        acceptBtnImgHover: '../../../assets/modal/btn_accept_hover.png',
        approveCallback: () => { },
        declineCallback: () => { },
      });
    }
  };

  handleConnetionErrorToSignalingServer = () => {
    console.error('LOST CONNECTION TO SYSTEM');
  };

  handleMicUnmute = () => {
    if (this.isModalOpen) {
      this.isModalOpen = false;
      this.appActions.closeMutedMicModal();
    }
  };

  isIosDevice = () => {
    return ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
  };

  getRemoteStream = () => {
    return this.remoteVideo.srcObject;
  };

  ngOnDestroy() {
    this.closeVideoStream();
    this.currentUserSubscription.unsubscribe();
    this.patientPeer.destroy();
  }
}
