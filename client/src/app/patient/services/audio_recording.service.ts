/* 
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioRecordingService {
  async recordAudio(stream: MediaStream, recordingDuration: number = 30000): Promise<File | Blob> {
    if (typeof MediaRecorder === 'undefined') {
      console.error('MediaRecorder API is not supported in this browser.');
      throw new Error('MediaRecorder API not supported.');
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('MediaStream does not contain any audio tracks.');
      throw new Error('No audio tracks found in the MediaStream.');
    }

    let mimeType = 'audio/webm; codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(`${mimeType} is not supported. Falling back to 'audio/webm'.`);
      mimeType = 'audio/webm';
    }

    const options = { mimeType };
    let audioChunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      try {
        const mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log("======audioBlob=======",audioBlob);
            const mp3Blob = await this.convertWebMToMP3(audioBlob);
            console.log("======mp3Blob=======",mp3Blob);
            const audioFile = new File([mp3Blob], 'recording.mp3', { type: 'audio/mpeg' });
            console.log("======audioFile=======",audioFile);
            resolve(audioFile);
          } catch (error) {
            console.error('Error during audio conversion:', error);
            reject(error);
          }
        };

        mediaRecorder.start(3000);
        setTimeout(() => mediaRecorder.stop(), recordingDuration);
      } catch (error) {
        console.error('Error starting MediaRecorder:', error);
        reject(error);
      }
    });
  }

  async convertWebMToMP3(webmBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const buffer = reader.result as ArrayBuffer;
        resolve(new Blob([buffer], { type: 'audio/mpeg' }));
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(webmBlob);
    });
  }
}
  */

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioRecordingService {
  private mediaRecorder!: MediaRecorder;
  private audioChunks: Blob[] = [];

  // Start recording
  startRecording(stream: MediaStream): void {
    if (typeof MediaRecorder === 'undefined') {
      console.error('MediaRecorder API is not supported in this browser.');
      throw new Error('MediaRecorder API not supported.');
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error('MediaStream does not contain any audio tracks.');
      throw new Error('No audio tracks found in the MediaStream.');
    }

    let mimeType = 'audio/webm; codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(`${mimeType} is not supported. Falling back to 'audio/webm'.`);
      mimeType = 'audio/webm';
    }

    const options = { mimeType };
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    console.log('Recording started.');
  }

  // Stop recording and return the audio file
  async stopRecording(): Promise<File | Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
        console.warn('No active recording to stop.');
        return reject(new Error('No active recording.'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          console.log('Recording stopped. Audio blob created:', audioBlob);

          const mp3Blob = await this.convertWebMToMP3(audioBlob);
          console.log('Converted to MP3:', mp3Blob);

          const audioFile = new File([mp3Blob], 'recording.mp3', { type: 'audio/mpeg' });
          resolve(audioFile);
        } catch (error) {
          console.error('Error during audio conversion:', error);
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  async convertWebMToMP3(webmBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const buffer = reader.result as ArrayBuffer;
        resolve(new Blob([buffer], { type: 'audio/mpeg' }));
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(webmBlob);
    });
  }
}