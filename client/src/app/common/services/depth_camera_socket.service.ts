import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

const SIZE_OF_SKELETON = 300 * 4;

@Injectable({ providedIn: 'root' })
export class DepthCameraSocketService {

  depthCameraSocket: any;
  private currentSkeletonSubject: BehaviorSubject<any>;
  public currentSkeletonBuffer: Observable<any>;
  private currentFrameSubject: BehaviorSubject<any>;
  public currentFrameBuffer: Observable<any>;
  private depthCameraConnectedSubject: BehaviorSubject<any>;
  public depthCameraConnected: Observable<any>;

  autoReconnectInterval = 60 * 1000;
  private _isDepthCameraConnected = false;

  constructor() {
    this.currentSkeletonSubject = new BehaviorSubject<any>([]);
    this.currentSkeletonBuffer = this.currentSkeletonSubject.asObservable();
    this.currentFrameSubject = new BehaviorSubject<any>(null);
    this.currentFrameBuffer = this.currentFrameSubject.asObservable();
    this.depthCameraConnectedSubject = new BehaviorSubject<any>(null);
    this.depthCameraConnected = this.currentFrameSubject.asObservable();
  }

  public get currentSkeletonBufferValue(): any {
    return this.currentSkeletonSubject.value;
  }

  public get currentFrameValue(): any {
    return this.currentFrameSubject.value;
  }

  public get isDepthCameraConnected(): any {
    return this._isDepthCameraConnected;
  }

  reconnect(evt) {
    this.depthCameraSocket.removeAllListeners();
    setTimeout(() => {
      this.connectToDepthCameraSocket();
    }, this.autoReconnectInterval);
  }

  connectToDepthCameraSocket() {
    this.depthCameraSocket = new WebSocket("ws://localhost:8084/web-socket");

    let buf = null;
    this.depthCameraSocket.onopen = (evt) => {
      this.depthCameraConnectedSubject.next(true);
      this._isDepthCameraConnected = true;
    }
    this.depthCameraSocket.onerror = (evt) => {
      console.warn('Error: ', evt);
    }
    this.depthCameraSocket.onclose = (evt) => {
      this.depthCameraConnectedSubject.next(false);
      this._isDepthCameraConnected = false;
      if (evt.code !== 1000) {
        this.reconnect(evt);
      }
    }

    this.depthCameraSocket.onmessage = (evt) => {

      const fileReader = new FileReader();
      fileReader.onloadend = (e: any) => {
        if (e.target.result.byteLength === SIZE_OF_SKELETON) {
          buf = new Int32Array(e.target.result);
          this.currentSkeletonSubject.next(buf);
        } else {
          this.currentFrameSubject.next(e.target.result);
        }
      }
      fileReader.readAsArrayBuffer(evt.data);
    };
  }
}

