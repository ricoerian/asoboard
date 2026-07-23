import { Injectable, inject } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { CanvasCollaborationService } from '../canvas/canvas-collaboration.service';

export interface WebRTCSignal {
  type: 'offer' | 'answer' | 'ice';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

@Injectable({
  providedIn: 'root',
})
export class WebRtcService {
  private peerConnections: Map<number, RTCPeerConnection> = new Map();
  private iceCandidateQueues: Map<number, RTCIceCandidateInit[]> = new Map();
  private localStream: MediaStream | null = null;

  private remoteAudioStreams = new Subject<{ userId: number; stream: MediaStream }>();
  public remoteAudioStreams$ = this.remoteAudioStreams.asObservable();

  private isMutedSubject = new BehaviorSubject<boolean>(true);
  public isMuted$ = this.isMutedSubject.asObservable();

  private collabService = inject(CanvasCollaborationService);

  private readonly iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor() {
    this.collabService.getWebRtcSignals().subscribe((signal) => {
      this.handleIncomingSignal(signal.senderId, signal.payload);
    });
  }

  async toggleMute(): Promise<boolean> {
    if (!this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.localStream.getAudioTracks().forEach((track) => {
          this.peerConnections.forEach((pc) => {
            pc.addTrack(track, this.localStream!);
          });
        });

        // Initially, the stream is active, so we are unmuted
        this.isMutedSubject.next(false);
        return false;
      } catch (e) {
        console.error('Microphone access denied or error:', e);
        return true;
      }
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      const newMutedState = !this.isMutedSubject.value;
      audioTrack.enabled = !newMutedState;
      this.isMutedSubject.next(newMutedState);
    }
    return this.isMutedSubject.value;
  }

  getMixableAudioStream(): MediaStream | null {
    return this.localStream;
  }

  private getPeerConnection(userId: number): RTCPeerConnection {
    if (!this.peerConnections.has(userId)) {
      const pc = new RTCPeerConnection(this.iceServers);

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, this.localStream!);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.collabService.sendWebRtcSignal(userId, {
            type: 'ice',
            data: event.candidate.toJSON(),
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        try {
          if (pc.signalingState !== 'stable') return;
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          this.collabService.sendWebRtcSignal(userId, {
            type: 'offer',
            data: offer as RTCSessionDescriptionInit,
          });
        } catch (e) {
          console.error('Error in negotiation:', e);
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.remoteAudioStreams.next({
            userId,
            stream: event.streams[0],
          });
        }
      };

      this.peerConnections.set(userId, pc);
    }
    return this.peerConnections.get(userId)!;
  }

  async initiateCall(targetUserId: number) {
    const pc = this.getPeerConnection(targetUserId);
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);

    this.collabService.sendWebRtcSignal(targetUserId, {
      type: 'offer',
      data: offer as RTCSessionDescriptionInit,
    });
  }

  private async handleIncomingSignal(senderId: number, signal: WebRTCSignal) {
    const pc = this.getPeerConnection(senderId);

    try {
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(
          new RTCSessionDescription(signal.data as RTCSessionDescriptionInit),
        );
        this.processIceQueue(senderId, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.collabService.sendWebRtcSignal(senderId, {
          type: 'answer',
          data: answer as RTCSessionDescriptionInit,
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(
          new RTCSessionDescription(signal.data as RTCSessionDescriptionInit),
        );
        this.processIceQueue(senderId, pc);
      } else if (signal.type === 'ice') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.data as RTCIceCandidateInit));
        } else {
          if (!this.iceCandidateQueues.has(senderId)) {
            this.iceCandidateQueues.set(senderId, []);
          }
          this.iceCandidateQueues.get(senderId)!.push(signal.data as RTCIceCandidateInit);
        }
      }
    } catch (e) {
      console.error('Error handling WebRTC signal', e);
    }
  }

  private async processIceQueue(userId: number, pc: RTCPeerConnection) {
    const queue = this.iceCandidateQueues.get(userId);
    if (queue) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding queued ICE candidate', e);
        }
      }
      this.iceCandidateQueues.delete(userId);
    }
  }

  cleanup() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    this.isMutedSubject.next(true);
  }
}
