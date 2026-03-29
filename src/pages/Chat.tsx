import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, Search, Phone, Video } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCall from '@/components/VideoCall';

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

const Chat = () => {
  const { user, profile, loading } = useAuth();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all users except self
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, organization_name')
        .neq('id', user.id);
      setUsers((data as ChatUser[]) || []);
    };
    fetchUsers();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUser) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);

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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === selectedUser.id) {
          setMessages(prev => [...prev, newMsg]);
          supabase.from('messages').update({ read: true }).eq('id', newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <DashboardLayout><div className="py-20 text-center text-muted-foreground">Loading...</div></DashboardLayout>;
  if (!profile || !user) return <Navigate to="/login" />;

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    setSending(true);
    const msg = { sender_id: user.id, receiver_id: selectedUser.id, content: newMessage.trim() };
    const { data, error } = await supabase.from('messages').insert(msg).select().single();
    if (!error && data) {
      setMessages(prev => [...prev, data as Message]);
      setNewMessage('');
    }
    setSending(false);
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const roleColor = (role: string) => {
    switch (role) {
      case 'restaurant': return 'bg-warning/20 text-warning';
      case 'ngo': return 'bg-primary/20 text-primary';
      case 'volunteer': return 'bg-success/20 text-success';
      case 'admin': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">Chat with restaurants, NGOs, and volunteers</p>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-240px)]">
        {/* User List */}
        <Card className="shadow-card flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-9 h-9" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${selectedUser?.id === u.id ? 'bg-primary/10' : ''}`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading">{initials(u.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{u.full_name}</div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${roleColor(u.role)}`}>{u.role}</span>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No users found</div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="shadow-card flex flex-col">
          {selectedUser ? (
            <>
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-heading">{initials(selectedUser.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-foreground">{selectedUser.full_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{selectedUser.role}{selectedUser.organization_name ? ` · ${selectedUser.organization_name}` : ''}</div>
                  </div>
                </div>
                <VideoCall
                  currentUserId={user.id}
                  currentUserName={profile.full_name}
                  remoteUserId={selectedUser.id}
                  remoteUserName={selectedUser.full_name}
                />
              </div>

              <ScrollArea className="flex-1 px-5 py-4">
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {messages.map(m => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                          m.sender_id === user.id
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted/60 text-foreground rounded-bl-md'
                        }`}>
                          <p>{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.sender_id === user.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {formatTime(m.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <form onSubmit={sendMessage} className="px-4 py-3 border-t border-border flex gap-2">
                <Input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || sending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
