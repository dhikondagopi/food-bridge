import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { HandHeart, Search, RefreshCw, Truck, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

interface Volunteer {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  city?: string;
  avatar_url?: string;
  created_at: string;
  is_blocked?: boolean;
  deliveries?: number;
}

const AdminVolunteers = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVolunteers = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'volunteer')
        .order('created_at', { ascending: false });

      const { data: pickups } = await supabase
        .from('pickup_requests')
        .select('volunteer_id')
        .eq('status', 'delivered')
        .not('volunteer_id', 'is', null);

      const deliveryCount: Record<string, number> = {};
      pickups?.forEach(p => {
        if (p.volunteer_id) deliveryCount[p.volunteer_id] = (deliveryCount[p.volunteer_id] || 0) + 1;
      });

      const enriched = (profiles || []).map(v => ({ ...v, deliveries: deliveryCount[v.id] || 0 }));
      setVolunteers(enriched as Volunteer[]);
    } catch { toast.error('Failed to load volunteers'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchVolunteers(); }, []);

  const filtered = volunteers.filter(v => {
    const q = searchQuery.toLowerCase();
    return q === '' || v.full_name?.toLowerCase().includes(q) || v.email?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q);
  });

  const totalDeliveries = volunteers.reduce((s, v) => s + (v.deliveries || 0), 0);
  const activeVolunteers = volunteers.filter(v => !v.is_blocked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <HandHeart className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white/80">Admin</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Volunteers</h1>
            <p className="mt-1 text-sm text-white/70">Manage volunteer accounts and track deliveries</p>
          </div>
          <Button onClick={() => fetchVolunteers(true)} disabled={refreshing}
            className="h-9 gap-2 rounded-xl bg-white/20 px-4 text-sm font-medium text-white hover:bg-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Total Volunteers',   value: volunteers.length, bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500', icon: HandHeart },
          { label: 'Active',             value: activeVolunteers,  bg: 'bg-sky-50 dark:bg-sky-500/10',         iconBg: 'bg-sky-500',     icon: CheckCircle },
          { label: 'Total Deliveries',   value: totalDeliveries,   bg: 'bg-violet-50 dark:bg-violet-500/10',   iconBg: 'bg-violet-500',  icon: Truck },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border border-border/60 ${c.bg} p-4 shadow-sm`}>
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${c.iconBg}`}>
              <c.icon className="h-4 w-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <HandHeart className="h-5 w-5" />
            Volunteers ({filtered.length})
          </CardTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name, email or city..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-xl pl-9 h-9 text-sm" />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <HandHeart className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No volunteers found</p>
            </div>
          ) : (
            <StaggerContainer className="space-y-2">
              {filtered.map(v => (
                <StaggerItem key={v.id}>
                  <div className={`flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:bg-muted/30 ${v.is_blocked ? 'opacity-60' : ''}`}>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {v.avatar_url ? <img src={v.avatar_url} alt={v.full_name} className="h-full w-full object-cover" /> : (v.full_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{v.full_name || '—'}</p>
                        <Badge variant={v.is_blocked ? 'destructive' : 'outline'} className="text-xs">
                          {v.is_blocked ? 'Blocked' : 'Active'}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {v.email && <span>{v.email}</span>}
                        {v.city && <span>📍 {v.city}</span>}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Joined {new Date(v.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-bold text-foreground">{v.deliveries}</div>
                      <div className="text-[10px] text-muted-foreground">deliveries</div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVolunteers;