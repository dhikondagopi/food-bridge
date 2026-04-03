import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoCallProps {
  callId: string;
  localUserId: string;
  remoteUserId: string;
  remoteUserName: string;
  callType: 'audio' | 'video';
  isIncoming: boolean;
  onEnd: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const VideoCall = ({
  callId,
  localUserId,
  remoteUserId,
  remoteUserName,
  callType,
  isIncoming,
  onEnd,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType === 'audio');
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'connecting'
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start timer when connected ──
  useEffect(() => {
    if (connected) {
      setStatus('connected');
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Setup local stream ──
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      toast.error('Could not access camera/microphone');
      throw err;
    }
  }, [callType]);

  // ── Create peer connection ──
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Remote stream
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnected(true);
      }
    };

    // ICE candidates — store in Supabase
    const iceCandidates: RTCIceCandidateInit[] = [];
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        iceCandidates.push(event.candidate.toJSON());
        const field = isIncoming ? 'receiver_ice' : 'caller_ice';
        await supabase.from('call_logs').update({ [field]: iceCandidates }).eq('id', callId);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    return pc;
  }, [callId, isIncoming, localStreamRef]);

  // ── Caller: create offer ──
  const startCall = useCallback(async () => {
    try {
      await getLocalStream();
      const pc = createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from('call_logs').update({
        offer: { type: offer.type, sdp: offer.sdp },
        status: 'ringing',
      }).eq('id', callId);

      setStatus('ringing');
    } catch (err) {
      toast.error('Failed to start call');
      onEnd();
    }
  }, [callId, getLocalStream, createPeerConnection, onEnd]);

  // ── Callee: accept call ──
  const acceptCall = useCallback(async () => {
    try {
      setStatus('connecting');
      await getLocalStream();
      const pc = createPeerConnection();

      // Get offer from DB
      const { data } = await supabase.from('call_logs').select('offer, caller_ice').eq('id', callId).single();
      if (!data?.offer) { toast.error('Call offer not found'); onEnd(); return; }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      // Add caller ICE candidates
      if (data.caller_ice) {
        for (const candidate of data.caller_ice) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await supabase.from('call_logs').update({
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'ongoing',
      }).eq('id', callId);

    } catch (err) {
      toast.error('Failed to accept call');
      onEnd();
    }
  }, [callId, getLocalStream, createPeerConnection, onEnd]);

  // ── Listen for answer (caller side) ──
  useEffect(() => {
    if (isIncoming) return;

    const channel = supabase
      .channel(`call-answer-${callId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_logs', filter: `id=eq.${callId}` },
        async (payload) => {
          const data = payload.new as any;
          const pc = pcRef.current;
          if (!pc) return;

          if (data.answer && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }

          if (data.receiver_ice && data.receiver_ice.length > 0) {
            for (const candidate of data.receiver_ice) {
              try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
            }
          }

          if (data.status === 'ended') endCall(false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [callId, isIncoming]);

  // ── End call ──
  const endCall = useCallback(async (updateDb = true) => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();

    if (updateDb) {
      await supabase.from('call_logs').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: callDuration,
      }).eq('id', callId);
    }

    setStatus('ended');
    onEnd();
  }, [callId, callDuration, onEnd]);

  // ── Initialize ──
  useEffect(() => {
    if (!isIncoming) startCall();
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  // ── Toggle mic ──
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(!muted);
  };

  // ── Toggle video ──
  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOff; });
    setVideoOff(!videoOff);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-slate-900 shadow-2xl">

          {/* Remote video (full bg) */}
          {callType === 'video' ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="h-[420px] w-full bg-slate-800 object-cover" />
          ) : (
            <div className="flex h-64 items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-4xl font-bold text-white">
                {remoteUserName[0]?.toUpperCase()}
              </div>
            </div>
          )}

          {/* Local video (PiP) */}
          {callType === 'video' && (
            <video
              ref={localVideoRef}
              autoPlay playsInline muted
              className="absolute bottom-24 right-4 h-28 w-20 rounded-xl border-2 border-white/20 object-cover shadow-lg"
            />
          )}

          {/* Status overlay */}
          <div className="absolute left-0 right-0 top-0 flex flex-col items-center pt-6 text-center">
            <p className="text-lg font-semibold text-white">{remoteUserName}</p>
            <p className="mt-1 text-sm text-white/60">
              {status === 'ringing' && 'Ringing...'}
              {status === 'connecting' && 'Connecting...'}
              {status === 'connected' && formatDuration(callDuration)}
              {status === 'ended' && 'Call ended'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 bg-slate-900/90 px-6 py-5 backdrop-blur">

            {/* Incoming — Accept/Decline */}
            {isIncoming && status === 'ringing' ? (
              <>
                <button
                  onClick={() => { setStatus('connecting'); acceptCall(); }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg transition hover:bg-emerald-600"
                >
                  <Phone className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={() => endCall()}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg transition hover:bg-red-600"
                >
                  <PhoneOff className="h-6 w-6 text-white" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition ${muted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {muted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
                </button>

                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition ${videoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                  >
                    {videoOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
                  </button>
                )}

                <button
                  onClick={() => endCall()}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 shadow-lg transition hover:bg-red-600"
                >
                  <PhoneOff className="h-6 w-6 text-white" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCall;