import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

interface CallProps {
  currentUserId: string;
  currentUserName: string;
  remoteUserId: string;
  remoteUserName: string;
}

type CallState = 'idle' | 'calling' | 'incoming' | 'connected';
type SignalData = {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-request' | 'call-accepted' | 'call-rejected' | 'call-ended';
  from: string;
  fromName: string;
  to: string;
  payload?: any;
  withVideo?: boolean;
};

const VideoCall = ({ currentUserId, currentUserName, remoteUserId, remoteUserName }: CallProps) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingWithVideo, setIncomingWithVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callLogIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Signaling channel
  useEffect(() => {
    const channelName = `call-signal-${[currentUserId, remoteUserId].sort().join('-')}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: SignalData }) => {
        if (payload.to !== currentUserId) return;
        handleSignal(payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      cleanup();
    };
  }, [currentUserId, remoteUserId]);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const sendSignal = useCallback((data: Omit<SignalData, 'from' | 'fromName' | 'to'>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { ...data, from: currentUserId, fromName: currentUserName, to: remoteUserId },
    });
  }, [currentUserId, currentUserName, remoteUserId]);

  const handleSignal = useCallback(async (signal: SignalData) => {
    switch (signal.type) {
      case 'call-request':
        setCallState('incoming');
        setIncomingWithVideo(!!signal.withVideo);
        break;

      case 'call-accepted':
        await startPeerConnection(true, isVideoCall);
        break;

      case 'call-rejected':
        toast.info(`${signal.fromName} declined the call`);
        updateCallLog('rejected');
        cleanup();
        setCallState('idle');
        break;

      case 'call-ended':
        toast.info('Call ended');
        updateCallLog('completed');
        cleanup();
        setCallState('idle');
        break;

      case 'offer':
        if (!peerConnection.current) await startPeerConnection(false, incomingWithVideo);
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(signal.payload));
        const answer = await peerConnection.current?.createAnswer();
        await peerConnection.current?.setLocalDescription(answer!);
        sendSignal({ type: 'answer', payload: answer });
        break;

      case 'answer':
        await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(signal.payload));
        break;

      case 'ice-candidate':
        if (signal.payload) {
          await peerConnection.current?.addIceCandidate(new RTCIceCandidate(signal.payload));
        }
        break;
    }
  }, [isVideoCall, incomingWithVideo, sendSignal]);

  const startPeerConnection = async (isInitiator: boolean, withVideo: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withVideo,
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnection.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal({ type: 'ice-candidate', payload: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setCallState('connected');
          callStartTimeRef.current = new Date();
          updateCallLog('ongoing');
        } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          updateCallLog('completed');
          cleanup();
          setCallState('idle');
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', payload: offer });
      }

      setCallState('connected');
    } catch (err) {
      toast.error('Could not access camera/microphone. Please check permissions.');
      cleanup();
      setCallState('idle');
    }
  };

  const cleanup = () => {
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const createCallLog = async (callType: string) => {
    const { data } = await supabase
      .from('call_logs')
      .insert({
        caller_id: currentUserId,
        receiver_id: remoteUserId,
        call_type: callType,
        status: 'missed',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (data) callLogIdRef.current = data.id;
  };

  const updateCallLog = async (status: string) => {
    if (!callLogIdRef.current) return;
    const updates: Record<string, any> = { status };
    if (status === 'completed' && callStartTimeRef.current) {
      updates.ended_at = new Date().toISOString();
      updates.duration_seconds = Math.floor((Date.now() - callStartTimeRef.current.getTime()) / 1000);
    }
    await supabase.from('call_logs').update(updates).eq('id', callLogIdRef.current);
    if (status !== 'ongoing') callLogIdRef.current = null;
  };

  const startCall = async (withVideo: boolean) => {
    setIsVideoCall(withVideo);
    setCallState('calling');
    sendSignal({ type: 'call-request', withVideo });
    await createCallLog(withVideo ? 'video' : 'voice');
    // Auto-timeout after 30s
    setTimeout(() => {
      if (callState === 'calling') {
        toast.info('No answer');
        sendSignal({ type: 'call-ended' });
        updateCallLog('missed');
        cleanup();
        setCallState('idle');
      }
    }, 30000);
  };

  const acceptCall = async () => {
    setIsVideoCall(incomingWithVideo);
    sendSignal({ type: 'call-accepted' });
    await startPeerConnection(false, incomingWithVideo);
  };

  const rejectCall = () => {
    sendSignal({ type: 'call-rejected' });
    updateCallLog('rejected');
    setCallState('idle');
  };

  const endCall = () => {
    sendSignal({ type: 'call-ended' });
    updateCallLog('completed');
    cleanup();
    setCallState('idle');
  };

  const toggleMute = () => {
    const audioTrack = localStream.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStream.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Call buttons in chat header */}
      {callState === 'idle' && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => startCall(false)} title="Voice call">
            <Phone className="h-4 w-4 text-success" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => startCall(true)} title="Video call">
            <Video className="h-4 w-4 text-primary" />
          </Button>
        </div>
      )}

      {/* Full-screen call overlay */}
      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            {/* Incoming call UI */}
            {callState === 'incoming' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <div className="relative mb-6">
                  <Avatar className="h-24 w-24 mx-auto border-4 border-primary/30">
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-heading">
                      {initials(remoteUserName)}
                    </AvatarFallback>
                  </Avatar>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full border-2 border-primary/20"
                  />
                </div>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-1">{remoteUserName}</h2>
                <p className="text-muted-foreground mb-8">
                  Incoming {incomingWithVideo ? 'video' : 'voice'} call...
                </p>
                <div className="flex items-center justify-center gap-6">
                  <Button
                    onClick={rejectCall}
                    size="lg"
                    className="rounded-full h-16 w-16 bg-destructive hover:bg-destructive/90"
                  >
                    <PhoneOff className="h-6 w-6 text-destructive-foreground" />
                  </Button>
                  <Button
                    onClick={acceptCall}
                    size="lg"
                    className="rounded-full h-16 w-16 bg-success hover:bg-success/90"
                  >
                    <Phone className="h-6 w-6 text-success-foreground" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Calling / Ringing UI */}
            {callState === 'calling' && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center"
              >
                <Avatar className="h-24 w-24 mx-auto mb-6 border-4 border-muted">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-heading">
                    {initials(remoteUserName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-heading text-2xl font-bold text-foreground mb-1">{remoteUserName}</h2>
                <p className="text-muted-foreground mb-8">Calling...</p>
                <Button
                  onClick={endCall}
                  size="lg"
                  className="rounded-full h-16 w-16 bg-destructive hover:bg-destructive/90"
                >
                  <PhoneOff className="h-6 w-6 text-destructive-foreground" />
                </Button>
              </motion.div>
            )}

            {/* Connected call UI */}
            {callState === 'connected' && (
              <div className="w-full h-full flex flex-col">
                {/* Video area */}
                <div className="flex-1 relative bg-black/10 dark:bg-black/40 rounded-lg mx-4 mt-4 overflow-hidden">
                  {/* Remote video / avatar */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${!isVideoCall ? 'hidden' : ''}`}
                  />
                  {!isVideoCall && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Avatar className="h-28 w-28 mb-4 border-4 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary text-3xl font-heading">
                          {initials(remoteUserName)}
                        </AvatarFallback>
                      </Avatar>
                      <h2 className="font-heading text-xl font-bold text-foreground">{remoteUserName}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{formatDuration(callDuration)}</p>
                    </div>
                  )}

                  {/* Local video (PiP) */}
                  {isVideoCall && (
                    <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-border shadow-elevated bg-black">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                      />
                      {isVideoOff && (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <VideoOff className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Duration overlay for video calls */}
                  {isVideoCall && (
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                      <span className="text-sm text-white font-medium">{formatDuration(callDuration)}</span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 py-6">
                  <Button
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="icon"
                    className="rounded-full h-12 w-12"
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  {isVideoCall && (
                    <Button
                      variant={isVideoOff ? 'destructive' : 'outline'}
                      size="icon"
                      className="rounded-full h-12 w-12"
                      onClick={toggleVideo}
                    >
                      {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </Button>
                  )}

                  <Button
                    onClick={endCall}
                    size="icon"
                    className="rounded-full h-14 w-14 bg-destructive hover:bg-destructive/90"
                  >
                    <PhoneOff className="h-6 w-6 text-destructive-foreground" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VideoCall;
