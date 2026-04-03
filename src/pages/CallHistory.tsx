import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  caller_profile?: { full_name: string } | null;
  receiver_profile?: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  ongoing:   { label: 'Ongoing',   color: 'text-sky-600 dark:text-sky-400',         bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20' },
  missed:    { label: 'Missed',    color: 'text-red-600 dark:text-red-400',          bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
  rejected:  { label: 'Declined',  color: 'text-amber-600 dark:text-amber-400',      bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
};

const CallHistory = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchCalls = async () => {
      // ✅ Use simple join without fk aliases that don't exist
      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          caller_profile:profiles!call_logs_caller_id_fkey(full_name),
          receiver_profile:profiles!call_logs_receiver_id_fkey(full_name)
        `)
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        // ✅ Fallback: fetch without join if FK names don't match
        const { data: fallback } = await supabase
          .from('call_logs')
          .select('*')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('started_at', { ascending: false })
          .limit(50);
        setCalls((fallback as CallLog[]) || []);
      } else {
        setCalls((data as CallLog[]) || []);
      }
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

  const getCallIcon = (call: CallLog) => {
    const isOutgoing = call.caller_id === user?.id;
    if (call.status === 'missed') return <PhoneMissed className="h-5 w-5 text-red-500" />;
    if (isOutgoing) return <PhoneOutgoing className="h-5 w-5 text-primary" />;
    return <PhoneIncoming className="h-5 w-5 text-emerald-500" />;
  };

  const getOtherName = (call: CallLog) => {
    if (call.caller_id === user?.id) return call.receiver_profile?.full_name || 'Unknown';
    return call.caller_profile?.full_name || 'Unknown';
  };

  // ✅ NO DashboardLayout wrapper — already wrapped by AnimatedRoutes → Profile pages
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Call History</h1>
            <p className="mt-0.5 text-sm text-white/70">Your recent audio and video calls</p>
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <Phone className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No calls yet</h3>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Your call history will appear here after you make or receive calls.
          </p>
        </motion.div>
      ) : (
        <StaggerContainer className="space-y-2">
          {calls.map((call) => {
            const sc = STATUS_CONFIG[call.status] ?? STATUS_CONFIG.missed;
            const isOutgoing = call.caller_id === user?.id;

            return (
              <StaggerItem key={call.id}>
                <motion.div
                  whileHover={{ y: -1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Call icon */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                    {getCallIcon(call)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground">
                        {getOtherName(call)}
                      </span>
                      {call.call_type === 'video'
                        ? <Video className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        : <Phone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      }
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                      <span>·</span>
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

                  {/* Status badge */}
                  <span className={`inline-flex flex-shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
};

export default CallHistory;