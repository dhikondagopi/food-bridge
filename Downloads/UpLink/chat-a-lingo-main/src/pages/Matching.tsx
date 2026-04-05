import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../socket";
import { Globe, Phone, PhoneOff, Search, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface OnlineUser {
  userId: string;
  name: string;
  nativeLanguage: string;
  learningLanguage: string;
  socketId: string;
}

interface IncomingCall {
  fromUserId: string;
  fromName: string;
  fromSocketId: string;
}

const Matching = () => {
  const navigate = useNavigate();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [search, setSearch] = useState("");
  const [filterLang, setFilterLang] = useState("All");
  const [callingUserId, setCallingUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const myUserId = localStorage.getItem("userId");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }

    // Announce presence with user info
    socket.emit("user_online", {
      name: me.name || "User",
      nativeLanguage: me.nativeLanguage || "",
      learningLanguage: me.learningLanguage || "",
    });

    socket.emit("get_online_users");

    socket.on("online_users_updated", (users: OnlineUser[]) => {
      setOnlineUsers(users.filter((u) => u.userId !== myUserId));
    });

    socket.on("incoming_call", (data: IncomingCall) => {
      setIncomingCall(data);
    });

    socket.on("call_accepted", ({ room }: { room: string }) => {
      setCallingUserId(null);
      navigate(`/chat?room=${room}`);
    });

    socket.on("call_rejected", () => {
      setCallingUserId(null);
      toast.error("User declined the call.");
    });

    socket.on("call_error", ({ message }: { message: string }) => {
      setCallingUserId(null);
      toast.error(message);
    });

    return () => {
      socket.off("online_users_updated");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("call_error");
    };
  }, [navigate, myUserId]);

  const callUser = (userId: string) => {
    setCallingUserId(userId);
    socket.emit("call_request", { toUserId: userId });

    // Auto-cancel after 30 seconds
    setTimeout(() => {
      setCallingUserId((prev) => {
        if (prev === userId) {
          toast("Call was not answered.");
          return null;
        }
        return prev;
      });
    }, 30000);
  };

  const cancelCall = () => {
    setCallingUserId(null);
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    setIncomingCall(null);
    socket.emit("call_accepted", { toUserId: incomingCall.fromUserId });
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    socket.emit("call_rejected", { toUserId: incomingCall.fromUserId });
    setIncomingCall(null);
  };

  // Get unique languages for filter pills
  const languages = [
    "All",
    ...Array.from(new Set(onlineUsers.flatMap((u) => [u.nativeLanguage, u.learningLanguage]).filter(Boolean))),
  ];

  const filtered = onlineUsers.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase());
    const matchLang =
      filterLang === "All" ||
      u.nativeLanguage === filterLang ||
      u.learningLanguage === filterLang;
    return matchSearch && matchLang;
  });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">

      {/* Incoming call overlay */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ minHeight: 300, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", position: "absolute", inset: 0, zIndex: 50 }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-card rounded-2xl border border-border p-8 text-center max-w-sm w-full mx-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">
                  {getInitials(incomingCall.fromName)}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {incomingCall.fromName}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Wants to start a session with you
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white gap-2"
                  onClick={acceptCall}
                >
                  <Phone className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  className="gap-2"
                  onClick={rejectCall}
                >
                  <PhoneOff className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Globe className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Find a partner</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Language filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setFilterLang(lang)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filterLang === lang
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "border-border text-muted-foreground hover:border-border/80"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Online count */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} online
            {filterLang !== "All" ? ` — ${filterLang}` : ""}
          </span>
          <span className="w-2 h-2 rounded-full bg-green-500 ml-1" />
        </div>

        {/* Users list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users online right now.</p>
            <p className="text-xs mt-1">Share the app with a friend to practice together!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((user) => (
                <motion.div
                  key={user.userId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-border/80 transition-all"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(user.name)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{user.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {user.nativeLanguage && (
                        <span className="text-xs text-muted-foreground">
                          Speaks {user.nativeLanguage}
                        </span>
                      )}
                      {user.nativeLanguage && user.learningLanguage && (
                        <span className="text-xs text-muted-foreground">·</span>
                      )}
                      {user.learningLanguage && (
                        <span className="text-xs text-muted-foreground">
                          Learning {user.learningLanguage}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call button */}
                  {callingUserId === user.userId ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Calling...</span>
                      <Button size="sm" variant="ghost" onClick={cancelCall}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="gradient-primary border-0 text-primary-foreground gap-2"
                      disabled={callingUserId !== null}
                      onClick={() => callUser(user.userId)}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Connect
                    </Button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matching;