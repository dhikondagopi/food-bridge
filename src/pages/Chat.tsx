import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, Search, Phone, Video } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCall from '@/components/VideoCall';
import { toast } from 'sonner';

interface ChatUser {
  id: string;
  full_name: string;
  role: string;
  organization_name?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const ROLE_COLOR: Record<string, string> = {
  restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  ngo:        'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
  volunteer:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  admin:      'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
};

const Chat = () => {
  const { user, profile, loading } = useAuth();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Call state ──
  const [activeCall, setActiveCall] = useState<{
    callId: string;
    remoteUserId: string;
    remoteUserName: string;
    callType: 'audio' | 'video';
    isIncoming: boolean;
  } | null>(null);

  // Fetch all users except self
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, role, organization_name')
          .neq('id', user.id)
          .order('full_name');
        if (error) { setUsersError('Failed to load users.'); setUsers([]); }
        else setUsers(data || []);
      } catch { setUsersError('Something went wrong. Try refreshing.'); setUsers([]); }
      finally { setUsersLoading(false); }
    };
    fetchUsers();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUser) { setMessages([]); return; }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      if (!error) setMessages(data || []);

      // Mark received messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', selectedUser.id)
        .eq('receiver_id', user.id)
        .eq('read', false);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${user.id}-${selectedUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedUser.id) {
            setMessages((prev) => [...prev, newMsg]);
            supabase.from('messages').update({ read: true }).eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Start a call ──
  const startCall = async (callType: 'audio' | 'video') => {
    if (!selectedUser || !user) return;
    try {
      const { data, error } = await supabase.from('call_logs').insert({
        caller_id: user.id,
        receiver_id: selectedUser.id,
        call_type: callType,
        status: 'ringing',
        started_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;

      setActiveCall({
        callId: data.id,
        remoteUserId: selectedUser.id,
        remoteUserName: selectedUser.full_name,
        callType,
        isIncoming: false,
      });
    } catch (err: any) {
      toast.error('Failed to start call');
    }
  };

  // ── Listen for incoming calls ──
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'call_logs',
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        const call = payload.new as any;
        if (call.status === 'ringing') {
          // Get caller name
          const { data: caller } = await supabase
            .from('profiles').select('full_name').eq('id', call.caller_id).single();
          setActiveCall({
            callId: call.id,
            remoteUserId: call.caller_id,
            remoteUserName: caller?.full_name || 'Unknown',
            callType: call.call_type,
            isIncoming: true,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" /></div>;
  if (!profile || !user) return <Navigate to="/login" />;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    setSending(true);
    const msg = { sender_id: user.id, receiver_id: selectedUser.id, content: newMessage.trim(), read: false };
    const { data, error } = await supabase.from('messages').insert(msg).select().single();
    if (!error && data) { setMessages((prev) => [...prev, data as Message]); setNewMessage(''); }
    setSending(false);
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    // ✅ NO DashboardLayout — already wrapped by AnimatedRoutes
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chat with restaurants, NGOs, and volunteers</p>
      </div>

      {/* ── Chat Layout ── */}
      <div className="grid flex-1 gap-4 overflow-hidden md:grid-cols-[300px_1fr]">

        {/* User List */}
        <Card className="flex flex-col overflow-hidden rounded-2xl border-border/60 shadow-sm">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="h-9 rounded-xl pl-9" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {usersLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : usersError ? (
              <div className="px-4 py-8 text-center text-sm text-destructive">
                {usersError}
                <Button variant="link" onClick={() => window.location.reload()} className="mt-2 h-auto p-0 text-sm block mx-auto">Retry</Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {users.length === 0 ? 'No users found' : 'No results for your search'}
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${selectedUser?.id === u.id ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}
                  >
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{u.full_name}</p>
                      <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${ROLE_COLOR[u.role] || 'bg-muted text-muted-foreground'}`}>
                        {u.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col overflow-hidden rounded-2xl border-border/60 shadow-sm">
          {selectedUser ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(selectedUser.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedUser.full_name}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {selectedUser.role}{selectedUser.organization_name ? ` · ${selectedUser.organization_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => startCall('audio')}>
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => startCall('video')}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                          m.sender_id === user.id
                            ? 'rounded-br-md bg-primary text-primary-foreground'
                            : 'rounded-bl-md bg-muted/70 text-foreground'
                        }`}>
                          <p className="leading-relaxed">{m.content}</p>
                          <p className={`mt-1 text-[10px] ${m.sender_id === user.id ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-border/60 px-4 py-3">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl"
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || sending} className="h-10 w-10 rounded-xl">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <MessageCircle className="h-8 w-8 opacity-40" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Select a conversation</p>
                <p className="mt-1 text-sm">Choose a user from the left panel to coordinate donations or pickups</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Active Call ── */}
      {activeCall && (
        <VideoCall
          callId={activeCall.callId}
          localUserId={user.id}
          remoteUserId={activeCall.remoteUserId}
          remoteUserName={activeCall.remoteUserName}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          onEnd={() => setActiveCall(null)}
        />
      )}
    </div>
  );
};

export default Chat;