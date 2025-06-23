import { Injectable, ElementRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeygenAPIService {
  API_CONFIG = {
    apiKey: "MTZkNDJlNmEzNzBjNDc1N2I5ZTUzNjY1NDA0ODEzMzAtMTczOTQzMzY4Mw==",
    // apiKey: "ZWE1NjlmOGZmNGIzNDg1M2FjYWY3Mzg",
    serverUrl: "https://api.heygen.com",
  };

  LivekitClient: any;
  newSessionInfo: any = null;
  private room: any = null;
  mediaStream: MediaStream | null = null;
  webSocket: WebSocket | null = null;
  sessionToken: string | null = null;

  avatarID: string = '';
  voiceID: string = '';
  taskInput: string = ''
  statusMessages: string[] = [];

  updateNewStatus(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.statusMessages.push(`[${timestamp}] ${message}`);
  }

  async getSessionToken() {
    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.API_CONFIG.apiKey,
      },
    });

    const data = await response.json();
    this.sessionToken = data.data.token;
    this.updateNewStatus("Session token obtained");
  }

  async connectWebSocket(sessionId: string) {
    const params = new URLSearchParams({
      session_id: sessionId,
      session_token: this.sessionToken!,
      silence_response: 'false',
      opening_text: "Hello, how can I help you?",
      stt_language: "en",
    });

    const wsUrl = `wss://${new URL(this.API_CONFIG.serverUrl).hostname}/v1/ws/streaming.chat?${params}`;
    this.webSocket = new WebSocket(wsUrl);

    this.webSocket.addEventListener("message", (event: MessageEvent) => {
      const eventData = JSON.parse(event.data);
      console.log("Raw WebSocket event:", eventData);
    });
  }

  async createNewSession() {
    if (!this.sessionToken) {
      await this.getSessionToken();
    }

    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        quality: "high",
        avatar_name: '2c57ba04ef4d4a5ca30a953d0791e7e3',
        voice: {
          voice_id: this.voiceID,
          rate: 1.0,
        },
        version: "v2",
        video_encoding: "H264",
      }),
    });

    const data = await response.json();
    console.warn("data : ", data)
    this.newSessionInfo = data.data;

    this.room = new this.LivekitClient.Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: this.LivekitClient.VideoPresets.h720.resolution,
      },
    });

    this.room.on(this.LivekitClient.RoomEvent.DataReceived, (message: any) => {
      const data = new TextDecoder().decode(message);
      // console.log("Room message:", JSON.parse(data));
    });

    this.mediaStream = new MediaStream();
    this.room.on(this.LivekitClient.RoomEvent.TrackSubscribed, (track: any) => {
      if (track.kind === "video" || track.kind === "audio") {
        this.mediaStream!.addTrack(track.mediaStreamTrack);
        if (this.mediaStream!.getVideoTracks().length > 0 && this.mediaStream!.getAudioTracks().length > 0) {
          const mediaElement = document.getElementById('mediaElement') as HTMLVideoElement;
          mediaElement.srcObject = this.mediaStream;
          this.updateNewStatus("Media stream ready");
        }
      }
    });

    this.room.on(this.LivekitClient.RoomEvent.TrackUnsubscribed, (track: any) => {
      const mediaTrack = track.mediaStreamTrack;
      if (mediaTrack) {
        this.mediaStream!.removeTrack(mediaTrack);
      }
    });

    this.room.on(this.LivekitClient.RoomEvent.Disconnected, (reason: any) => {
      this.updateNewStatus(`Room disconnected: ${reason}`);
    });

    await this.room.prepareConnection(this.newSessionInfo.url, this.newSessionInfo.access_token);
    this.updateNewStatus("Connection prepared");

    await this.connectWebSocket(this.newSessionInfo.session_id);
    this.updateNewStatus("Session created successfully");
  }

  async startStreamingSession() {
    const startResponse = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
      }),
    });

    await this.room.connect(this.newSessionInfo.url, this.newSessionInfo.access_token);
    this.updateNewStatus("Connected to room");
  }

  async sendText(text: string, taskType: string = "talk") {
    if (!this.newSessionInfo) {
      this.updateNewStatus("No active session");
      return;
    }

    const response = await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
        text: text,
        task_type: taskType,
      }),
    });

    this.updateNewStatus(`Sent text (${taskType}): ${text}`);
  }

  async closeSession() {
    if (!this.newSessionInfo) {
      this.updateNewStatus("No active session");
      return;
    }

    await fetch(`${this.API_CONFIG.serverUrl}/v1/streaming.stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.sessionToken}`,
      },
      body: JSON.stringify({
        session_id: this.newSessionInfo.session_id,
      }),
    });

    if (this.webSocket) {
      this.webSocket.close();
    }
    if (this.room) {
      this.room.disconnect();
    }

    const mediaElement = document.getElementById('mediaElement') as HTMLVideoElement;
    mediaElement.srcObject = null;
    this.newSessionInfo = null;
    this.room = null;
    this.mediaStream = null;
    this.sessionToken = null;

    this.updateNewStatus("Session closed");
  }

  onStart() {
    this.createNewSession().then(() => this.startStreamingSession());
  }

  onClose() {
    this.closeSession();
  }
}