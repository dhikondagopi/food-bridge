import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';

interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  caller_profile?: { full_name: string };
  receiver_profile?: { full_name: string };
}

const CallHistory = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCalls = async () => {
      const { data } = await supabase
        .from('call_logs')
        .select('*, caller_profile:profiles!fk_caller(full_name), receiver_profile:profiles!fk_receiver(full_name)')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(50);
      setCalls((data as CallLog[]) || []);
      setLoading(false);
    };
    fetchCalls();
  }, [user]);

  const formatDuration = (s: number) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) return `Today, ${time}`;
    if (diffDays === 1) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      completed: { variant: 'default', label: 'Completed' },
      ongoing: { variant: 'secondary', label: 'Ongoing' },
      missed: { variant: 'destructive', label: 'Missed' },
      rejected: { variant: 'outline', label: 'Declined' },
    };
    const info = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const getCallIcon = (call: CallLog) => {
    const isOutgoing = call.caller_id === user?.id;
    if (call.status === 'missed') return <PhoneMissed className="h-5 w-5 text-destructive" />;
    if (isOutgoing) return <PhoneOutgoing className="h-5 w-5 text-primary" />;
    return <PhoneIncoming className="h-5 w-5 text-accent-foreground" />;
  };

  const getOtherName = (call: CallLog) => {
    if (call.caller_id === user?.id) return call.receiver_profile?.full_name || 'Unknown';
    return call.caller_profile?.full_name || 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-heading font-bold text-foreground mb-6">Call History</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Phone className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No calls yet</p>
              <p className="text-sm">Your call history will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {calls.map(call => (
              <Card key={call.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <div className="shrink-0">{getCallIcon(call)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{getOtherName(call)}</span>
                      {call.call_type === 'video' ? (
                        <Video className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{formatTime(call.started_at)}</span>
                      {call.status === 'completed' && call.duration_seconds > 0 && (
                        <>
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(call.duration_seconds)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(call.status)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CallHistory;
