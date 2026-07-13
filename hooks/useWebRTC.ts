'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getSignalSocket } from '@/lib/socket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export type CallState = 'idle' | 'ringing' | 'calling' | 'connected';
export type CallType = 'audio' | 'video';

interface UseWebRTCOptions {
  onRemoteStream?: (stream: MediaStream) => void;
  onCallEnd?: () => void;
}

export default function useWebRTC({ onRemoteStream, onCallEnd }: UseWebRTCOptions = {}) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetUserIdRef = useRef<string>('');

  const clearDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  const closePeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);
  }, []);

  const cleanup = useCallback(() => {
    clearDurationTimer();
    setCallDuration(0);
    stopLocalStream();
    closePeer();
    setCallState('idle');
    setIsMuted(false);
    setIsVideoOff(false);
    targetUserIdRef.current = '';
  }, [clearDurationTimer, stopLocalStream, closePeer]);

  const getLocalStream = useCallback(async (video: boolean): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: video ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track);
      });
      setRemoteStream(new MediaStream(remote.getTracks()));
      onRemoteStream?.(remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSignalSocket();
        socket?.emit('call:ice-candidate', {
          to: targetUserIdRef.current,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        durationTimerRef.current = setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
        onCallEnd?.();
      }
    };

    return pc;
  }, [onRemoteStream, onCallEnd, cleanup]);

  const startCall = useCallback(async (targetUserId: string, type: CallType) => {
    console.log('[WebRTC] startCall:', targetUserId, type);
    targetUserIdRef.current = targetUserId;
    setCallType(type);
    setCallState('calling');

    try {
      const stream = await getLocalStream(type === 'video');
      console.log('[WebRTC] got local stream');
      const pc = createPeerConnection(stream);
      console.log('[WebRTC] created peer connection');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] created offer');

      const socket = getSignalSocket();
      console.log('[WebRTC] signal socket:', socket?.connected);
      socket?.emit('call:offer', {
        to: targetUserId,
        offer: pc.localDescription?.toJSON(),
        callType: type,
      });
      console.log('[WebRTC] emitted call:offer');
    } catch (e) {
      console.log('[WebRTC] startCall error:', e);
    }
  }, [getLocalStream, createPeerConnection]);

  const acceptCall = useCallback(async (fromUserId: string, type: CallType) => {
    targetUserIdRef.current = fromUserId;
    setCallType(type);
    setCallState('connected');

    await getLocalStream(type === 'video');

    const socket = getSignalSocket();
    socket?.emit('call:accept', { to: fromUserId });
  }, [getLocalStream]);

  const handleOffer = useCallback(async (fromUserId: string, offer: RTCSessionDescriptionInit, type: CallType) => {
    targetUserIdRef.current = fromUserId;
    setCallType(type);
    setCallState('connected');

    const stream = await getLocalStream(type === 'video');
    const pc = createPeerConnection(stream);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const socket = getSignalSocket();
    socket?.emit('call:answer', {
      to: fromUserId,
      answer: pc.localDescription?.toJSON(),
    });
  }, [getLocalStream, createPeerConnection]);

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }, []);

  const endCall = useCallback(() => {
    const socket = getSignalSocket();
    if (targetUserIdRef.current) {
      socket?.emit('call:end', { to: targetUserIdRef.current });
    }
    cleanup();
    onCallEnd?.();
  }, [cleanup, onCallEnd]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    const socket = getSignalSocket();
    if (!socket) return;

    socket.on('call:offer', ({ from, offer, callType: type }: { from: string; offer: RTCSessionDescriptionInit; callType: CallType }) => {
      handleOffer(from, offer, type);
    });

    socket.on('call:answer', ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      handleAnswer(answer);
    });

    socket.on('call:ice-candidate', ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      handleIceCandidate(candidate);
    });

    socket.on('call:end', () => {
      cleanup();
      onCallEnd?.();
    });

    socket.on('call:rejected', () => {
      cleanup();
      onCallEnd?.();
    });

    return () => {
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:end');
      socket.off('call:rejected');
    };
  }, [handleOffer, handleAnswer, handleIceCandidate, cleanup, onCallEnd]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    setCallState,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo,
    cleanup,
  };
}
