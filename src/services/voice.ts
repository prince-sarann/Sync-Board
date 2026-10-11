/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoicePeer, VoiceState } from '../types';
import { socketService } from './socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export type VoiceStateListener = (state: VoiceState, peers: VoicePeer[]) => void;

class VoiceManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private voicePeers: Map<string, VoicePeer> = new Map();

  // Web Audio speaking detection
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private speakingCheckInterval: number | null = null;
  private isCurrentlySpeaking: boolean = false;

  private currentClassCode: string | null = null;
  private state: VoiceState = {
    isConnected: false,
    isConnecting: false,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    error: null,
    activeSpeakers: new Set(),
  };

  private listeners: Set<VoiceStateListener> = new Set();

  constructor() {
    this.setupSocketListeners();
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public getPeers(): VoicePeer[] {
    return Array.from(this.voicePeers.values());
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState(), this.getPeers());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    const currentPeers = this.getPeers();
    this.listeners.forEach((l) => {
      try {
        l(currentState, currentPeers);
      } catch (err) {
        console.error('Error in voice state listener:', err);
      }
    });
  }

  private setupSocketListeners() {
    const socket = socketService.connect();

    // A remote peer joined voice
    socket.on('voice_peer_joined', (data: {
      socketId: string;
      userId: string;
      name: string;
      color: string;
      role: 'teacher' | 'student';
      isMuted: boolean;
      isSpeaking: boolean;
    }) => {
      if (!this.state.isConnected || !this.localStream) return;

      this.voicePeers.set(data.socketId, {
        socketId: data.socketId,
        userId: data.userId,
        name: data.name,
        color: data.color,
        role: data.role,
        isMuted: data.isMuted,
        isSpeaking: data.isSpeaking,
      });

      // Existing peer initiates WebRTC offer to newly joined peer
      this.createPeerConnection(data.socketId, true);
      this.notify();
    });

    // Remote WebRTC signal (Offer, Answer, ICE Candidate)
    socket.on('voice_signal', async (data: { senderSocketId: string; signal: any }) => {
      if (!this.state.isConnected || !this.localStream) return;
      const { senderSocketId, signal } = data;

      try {
        if (signal.type === 'offer') {
          // Received offer from peer: create connection, set remote, send answer
          const pc = this.createPeerConnection(senderSocketId, false);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          // Process any queued candidates
          const queued = this.pendingCandidates.get(senderSocketId) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          this.pendingCandidates.delete(senderSocketId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (this.currentClassCode) {
            socketService.emitVoiceSignal(this.currentClassCode, senderSocketId, {
              type: 'answer',
              sdp: answer,
            });
          }
        } else if (signal.type === 'answer') {
          // Received answer
          const pc = this.peerConnections.get(senderSocketId);
          if (pc && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

            const queued = this.pendingCandidates.get(senderSocketId) || [];
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            this.pendingCandidates.delete(senderSocketId);
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          // Received ICE Candidate
          const pc = this.peerConnections.get(senderSocketId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            // Queue until remote description is ready
            const queued = this.pendingCandidates.get(senderSocketId) || [];
            queued.push(signal.candidate);
            this.pendingCandidates.set(senderSocketId, queued);
          }
        }
      } catch (err) {
        console.warn('Error handling WebRTC voice signal from peer:', err);
      }
    });

    // Remote peer mute toggle
    socket.on('voice_mute_changed', (data: { socketId: string; isMuted: boolean }) => {
      const peer = this.voicePeers.get(data.socketId);
      if (peer) {
        peer.isMuted = data.isMuted;
        if (data.isMuted) {
          peer.isSpeaking = false;
          this.state.activeSpeakers.delete(data.socketId);
        }
        this.notify();
      }
    });

    // Remote peer speaking status
    socket.on('voice_speaking_changed', (data: { socketId: string; isSpeaking: boolean }) => {
      const peer = this.voicePeers.get(data.socketId);
      if (peer) {
        peer.isSpeaking = data.isSpeaking;
        if (data.isSpeaking) {
          this.state.activeSpeakers.add(data.socketId);
        } else {
          this.state.activeSpeakers.delete(data.socketId);
        }
        this.notify();
      }
    });

    // Remote peer left voice
    socket.on('voice_peer_left', (data: { socketId: string }) => {
      this.closePeer(data.socketId);
      this.voicePeers.delete(data.socketId);
      this.state.activeSpeakers.delete(data.socketId);
      this.notify();
    });
  }

  private createPeerConnection(peerSocketId: string, isInitiator: boolean): RTCPeerConnection {
    // If existing connection, close it cleanly first
    if (this.peerConnections.has(peerSocketId)) {
      this.closePeer(peerSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerSocketId, pc);

    // Add local audio tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    // ICE Candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentClassCode) {
        socketService.emitVoiceSignal(this.currentClassCode, peerSocketId, {
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    // Remote audio track received
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        this.attachRemoteStream(peerSocketId, remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(peerSocketId);
      }
    };

    // If this peer is initiator, create and send Offer
    if (isInitiator) {
      setTimeout(async () => {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          });
          await pc.setLocalDescription(offer);

          if (this.currentClassCode) {
            socketService.emitVoiceSignal(this.currentClassCode, peerSocketId, {
              type: 'offer',
              sdp: offer,
            });
          }
        } catch (err) {
          console.warn('Failed to create WebRTC voice offer:', err);
        }
      }, 50);
    }

    return pc;
  }

  private attachRemoteStream(peerSocketId: string, stream: MediaStream) {
    let audio = this.audioElements.get(peerSocketId);
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      (audio as any).playsInline = true;
      this.audioElements.set(peerSocketId, audio);
    }

    audio.srcObject = stream;
    audio.muted = this.state.isDeafened;
    audio.volume = this.state.isDeafened ? 0 : 1.0;

    audio.play().catch(() => {
      // Autoplay restriction handling
      const resumeAudio = () => {
        audio?.play().catch(() => {});
        window.removeEventListener('click', resumeAudio);
        window.removeEventListener('touchstart', resumeAudio);
      };
      window.addEventListener('click', resumeAudio, { once: true });
      window.addEventListener('touchstart', resumeAudio, { once: true });
    });

    const peer = this.voicePeers.get(peerSocketId);
    if (peer) {
      peer.stream = stream;
      this.notify();
    }
  }

  private closePeer(peerSocketId: string) {
    const pc = this.peerConnections.get(peerSocketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerSocketId);
    }

    const audio = this.audioElements.get(peerSocketId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerSocketId);
    }

    this.pendingCandidates.delete(peerSocketId);
  }

  // ==========================================
  // PUBLIC CONTROLS
  // ==========================================

  public async joinVoice(classCode: string): Promise<{ success: boolean; error?: string }> {
    if (!classCode) {
      return { success: false, error: 'Invalid class code.' };
    }

    if (this.state.isConnected) {
      return { success: true };
    }

    this.state.isConnecting = true;
    this.state.error = null;
    this.notify();

    // Check WebRTC browser support
    if (typeof window === 'undefined' || !window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      this.state.isConnecting = false;
      this.state.error = 'Voice is not supported on this browser.';
      this.notify();
      return { success: false, error: 'Voice is not supported on this browser.' };
    }

    try {
      // 1. Request microphone access with advanced acoustic filters
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });

      this.currentClassCode = classCode;

      // 2. Setup active voice detection analyser
      this.startSpeakingDetection(this.localStream);

      // 3. Notify server via Socket.IO
      const res = await socketService.emitVoiceJoin(classCode);
      if (!res.success) {
        this.leaveVoice();
        this.state.error = res.message || 'Voice connection failed. Please try again.';
        this.notify();
        return { success: false, error: this.state.error };
      }

      this.state.isConnected = true;
      this.state.isConnecting = false;
      this.state.isMuted = false;
      this.state.isDeafened = false;

      // 4. Initialize existing voice peers
      if (res.existingVoicePeers && Array.isArray(res.existingVoicePeers)) {
        this.voicePeers.clear();
        for (const peer of res.existingVoicePeers) {
          this.voicePeers.set(peer.socketId, {
            ...peer,
          });
        }
      }

      this.notify();
      return { success: true };
    } catch (err: any) {
      this.leaveVoice();
      let errorMsg = 'Voice connection failed. Please try again.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone permission is required to use voice.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Microphone unavailable. You can continue using the whiteboard.';
      }

      this.state.isConnecting = false;
      this.state.isConnected = false;
      this.state.error = errorMsg;
      this.notify();
      return { success: false, error: errorMsg };
    }
  }

  public leaveVoice() {
    if (this.currentClassCode) {
      socketService.emitVoiceLeave(this.currentClassCode);
    }

    // Stop speaking detection
    this.stopSpeakingDetection();

    // Stop and release local microphone track
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close all WebRTC peer connections
    for (const [peerSocketId] of this.peerConnections) {
      this.closePeer(peerSocketId);
    }
    this.peerConnections.clear();

    // Remove audio elements
    for (const [, audio] of this.audioElements) {
      audio.srcObject = null;
      audio.remove();
    }
    this.audioElements.clear();
    this.voicePeers.clear();
    this.pendingCandidates.clear();

    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.isMuted = false;
    this.state.isSpeaking = false;
    this.state.activeSpeakers.clear();
    this.currentClassCode = null;

    this.notify();
  }

  public toggleMute(): boolean {
    if (!this.localStream || !this.state.isConnected) return false;

    const nextMuted = !this.state.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    this.state.isMuted = nextMuted;
    if (nextMuted) {
      this.state.isSpeaking = false;
    }

    if (this.currentClassCode) {
      socketService.emitVoiceMuteToggle(this.currentClassCode, nextMuted);
    }

    this.notify();
    return nextMuted;
  }

  public toggleDeafen(): boolean {
    if (!this.state.isConnected) return false;

    const nextDeafened = !this.state.isDeafened;
    this.state.isDeafened = nextDeafened;

    // Adjust all remote audio playback
    this.audioElements.forEach((audio) => {
      audio.muted = nextDeafened;
      audio.volume = nextDeafened ? 0 : 1.0;
    });

    this.notify();
    return nextDeafened;
  }

  // ==========================================
  // ACTIVE SPEAKER DETECTION VIA WEB AUDIO
  // ==========================================

  private startSpeakingDetection(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;

      this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
      this.microphoneSource.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      this.speakingCheckInterval = window.setInterval(() => {
        if (!this.analyser || this.state.isMuted || !this.state.isConnected) {
          if (this.isCurrentlySpeaking) {
            this.isCurrentlySpeaking = false;
            this.state.isSpeaking = false;
            if (this.currentClassCode) {
              socketService.emitVoiceSpeaking(this.currentClassCode, false);
            }
            this.notify();
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Threshold for speaking (volume > 15 out of 255)
        const isSpeakingNow = average > 14;

        if (isSpeakingNow) {
          speakingCounter = Math.min(speakingCounter + 1, 5);
        } else {
          speakingCounter = Math.max(speakingCounter - 1, 0);
        }

        const nextSpeaking = speakingCounter >= 2;

        if (nextSpeaking !== this.isCurrentlySpeaking) {
          this.isCurrentlySpeaking = nextSpeaking;
          this.state.isSpeaking = nextSpeaking;
          if (this.currentClassCode) {
            socketService.emitVoiceSpeaking(this.currentClassCode, nextSpeaking);
          }
          this.notify();
        }
      }, 100);
    } catch {
      // AudioContext unavailable or blocked - safe ignore
    }
  }

  private stopSpeakingDetection() {
    if (this.speakingCheckInterval !== null) {
      clearInterval(this.speakingCheckInterval);
      this.speakingCheckInterval = null;
    }
    if (this.microphoneSource) {
      this.microphoneSource.disconnect();
      this.microphoneSource = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.isCurrentlySpeaking = false;
  }
}

export const voiceManager = new VoiceManager();
