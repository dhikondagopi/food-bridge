import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Peer from "peerjs";
import { socket } from "../socket";
import toast, { Toaster } from "react-hot-toast";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Send,
  MoreVertical, Globe, Maximize2, Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  text: string;
  sender: "me" | "partner";
  time: string;
}

const ROOM = "video-chat-room";

const ChatRoom = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  // ✅ FIXED — WebRTC init runs once only, no getMediaStream in deps
  useEffect(() => {
    let mounted = true;

    const initWebRTC = async () => {
      // ✅ FIXED — get stream directly here, not via useCallback
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        currentStreamRef.current = stream;
        if (myVideo.current) myVideo.current.srcObject = stream;
      } catch (err: any) {
        // ✅ FIXED — user-facing error messages instead of silent console.error
        if (err.name === "NotAllowedError") {
          toast.error("Camera/mic permission denied. Please allow access and reload.");
        } else if (err.name === "NotFoundError") {
          toast.error("No camera or microphone found on this device.");
        } else {
          toast.error("Could not access media devices.");
        }
        return;
      }

      // ✅ FIXED — PeerJS host/port from env vars so it works in production
      const peer = new Peer(undefined, {
        host: import.meta.env.VITE_PEER_HOST || "localhost",
        port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
        path: "/peer",
        secure: import.meta.env.PROD,
      });
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log("🎥 Peer ID:", id);
        socket.emit("video-join", id);
      });

      peer.on("error", (err) => {
        console.error("PeerJS error:", err);
        toast.error("Video connection error. Try rejoining.");
      });

      // Handle incoming calls
      peer.on("call", (call) => {
        currentCallRef.current = call;
        call.answer(stream!);
        call.on("stream", (remoteStream) => {
          if (userVideo.current && mounted) {
            userVideo.current.srcObject = remoteStream;
          }
        });
        call.on("close", () => {
          if (userVideo.current) userVideo.current.srcObject = null;
        });
      });
    };

    // ✅ FIXED — use "join_room" to match server.js handler
    socket.emit("join_room", ROOM);

    socket.on("user-connected", (userId: string) => {
      console.log("👥 New user connected:", userId);
      if (peerRef.current && currentStreamRef.current) {
        const call = peerRef.current.call(userId, currentStreamRef.current);
        currentCallRef.current = call;
        call.on("stream", (remoteStream) => {
          if (userVideo.current && mounted) {
            userVideo.current.srcObject = remoteStream;
          }
        });
      }
    });

    // ✅ FIXED — handle partner leaving
    socket.on("user-disconnected", () => {
      if (userVideo.current) userVideo.current.srcObject = null;
      toast("Partner left the session.", { icon: "👋" });
    });

    socket.on("receive_message", (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.text || data.message,
          sender: "partner",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    });

    initWebRTC();

    return () => {
      mounted = false;
      socket.off("user-connected");
      socket.off("user-disconnected");
      socket.off("receive_message");
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (currentCallRef.current) currentCallRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
      // ✅ Pass room name so server handler knows which room to leave
      socket.emit("leave_room", ROOM);
    };
  }, []); // ✅ FIXED — empty deps, runs once only

  // ✅ FIXED — toggle tracks directly, never re-init WebRTC
  useEffect(() => {
    const stream = currentStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = isVideoOn));
    stream.getAudioTracks().forEach((t) => (t.enabled = isMicOn));
  }, [isVideoOn, isMicOn]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    socket.emit("send_message", { room: ROOM, text });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        sender: "me",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    setNewMessage("");
  };

  const leaveSession = () => {
    socket.emit("leave_room", ROOM);
    navigate("/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex flex-col bg-gradient-to-br from-background to-muted/50 overflow-hidden"
    >
      {/* Toast notifications */}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="h-16 bg-card/95 backdrop-blur-md border-b border-border/50 px-6 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Globe className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">Live Video Session</h1>
            <p className="text-sm text-muted-foreground">Real-time language practice</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-11 w-11">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={leaveSession} className="text-destructive">
              <PhoneOff className="h-4 w-4 mr-2" />
              End Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Panel */}
        <motion.div
          layout
          className={`relative bg-black/20 backdrop-blur-sm flex flex-col border-r border-border/30 transition-all duration-500 ${
            isVideoExpanded ? "flex-1" : "w-80 hidden lg:flex"
          }`}
        >
          <div className="flex-1 relative overflow-hidden rounded-t-lg">
            <video ref={userVideo} autoPlay playsInline className="w-full h-full object-cover" />
            <video
              ref={myVideo}
              autoPlay
              muted
              playsInline
              className="absolute bottom-4 right-4 w-28 h-24 rounded-2xl border-4 border-card/90 shadow-2xl"
            />
          </div>

          {/* Controls */}
          <div className="h-20 flex items-center justify-center gap-4 bg-gradient-to-r from-card/95 to-card/80 backdrop-blur-md border-t border-border/50 px-4">
            <Button
              size="icon"
              variant={isMicOn ? "secondary" : "destructive"}
              className="h-14 w-14 shadow-lg hover:shadow-xl transition-all"
              onClick={() => setIsMicOn(!isMicOn)}
            >
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
            <Button
              size="icon"
              variant={isVideoOn ? "secondary" : "destructive"}
              className="h-14 w-14 shadow-lg hover:shadow-xl transition-all"
              onClick={() => setIsVideoOn(!isVideoOn)}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-14 w-14"
              onClick={() => setIsVideoExpanded(!isVideoExpanded)}
            >
              {isVideoExpanded ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
            </Button>
          </div>
        </motion.div>

        {/* Chat Panel */}
        <div className={`flex flex-col ${isVideoExpanded ? "hidden lg:flex" : "flex-1"}`}>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background/80 backdrop-blur-sm">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
              </div>
            )}
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`flex ${m.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-6 py-3 rounded-2xl shadow-lg max-w-[75%] backdrop-blur-md border ${
                    m.sender === "me"
                      ? "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground border-primary/30 rounded-br-sm"
                      : "bg-card/90 border-border/40 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm font-medium">{m.text}</p>
                  <p className={`text-xs mt-1 opacity-75 ${
                    m.sender === "me" ? "text-primary-foreground" : "text-muted-foreground"
                  }`}>
                    {m.time}
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="p-6 border-t border-border/30 bg-card/80 backdrop-blur-sm">
            <div className="flex items-end gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 bg-background/50 border-border/50 focus-visible:ring-primary/50"
              />
              <Button
                type="submit"
                size="icon"
                className="h-14 w-14 gradient-primary shadow-lg hover:shadow-xl"
                disabled={!newMessage.trim()}
              >
                <Send className="h-6 w-6" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatRoom;