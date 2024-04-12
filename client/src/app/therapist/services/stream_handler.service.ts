import { Injectable } from '@angular/core';

@Injectable()
export class StreamHandlerService {
  constructor() {}

  muteMicrophone = (stream) => {
    if (stream.track) {
      stream.track.getAudioTracks()[0].enabled = false;
    } else {
      stream.getAudioTracks()[0].enabled = false;
    }
    return stream;
  };

  unMuteMicrophone = (stream) => {
    if (stream.track) {
      stream.track.getAudioTracks()[0].enabled = true;
    } else {
      stream.getAudioTracks()[0].enabled = true;
    }
    return stream;
  };

  muteAllActiveStreams = (audioTracks) => {
    audioTracks.map((call) => this.muteMicrophone(call));
    return audioTracks;
  };

  isStreamAudioEnabled = (stream) => {
    if (stream.track) {
      return stream.track.getAudioTracks()[0].enabled;
    } else {
      return stream.getAudioTracks()[0].enabled;
    }
  };
}
