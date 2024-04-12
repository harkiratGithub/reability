import { environment } from '../../../environments/environment';
import { Injectable } from '@angular/core';

import Peer from 'peerjs';

@Injectable()
export class WebRtcService {

  therapistPeer: any;

  constructor() {
  }

  joinSession(patientPeerId, therapist, localStream) {
    const therapistName = therapist.firstname + ' ' + therapist.lastname;
    const therapistCall = (this.therapistPeer as Peer).call(patientPeerId, localStream, { metadata: therapistName });
    return therapistCall;
  }

  initialize(peerId, iceServers) {
    this.therapistPeer = new Peer(peerId, {
      host: environment.signalingServer,
      port: environment.signalingServerPort,
      path: `/api`,
      debug: 3,
      key: environment.secretKey,
      config: {
        iceServers: [...iceServers.iceServers],
        iceTransportPolicy: iceServers.onlyTcp ? 'relay' : 'all',
      },
      secure: true
    });
    return this.therapistPeer;
  }

  getTherapistPeer() {
    return this.therapistPeer;
  }

  destroyPeer() {
    if (this.therapistPeer) {
      this.therapistPeer.destroy();
    }
  }

  broadcastMessage(message, connectedPaitents) {
    connectedPaitents.map(conn => {
      conn.connection.send(message);
    });
  }

  privateMessage(remotePeerId, message, connectedPaitents, conn = null) {
    if (conn) {
      conn.send(message);
    } else {
      let connectionData = connectedPaitents.find(
        conn => conn.connection.peer === remotePeerId
      );
      if (connectionData) {
        connectionData.connection.send(message);
      }
    }
  }
}
