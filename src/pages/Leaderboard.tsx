import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy, Users, Package, Truck, TrendingUp,
  Crown, ChevronRight, Utensils,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';

interface RankedUser {
  id: string;
  full_name: string;
  organization_name: string | null;
  avatar_url: string | null;
  count: number;
}

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];
const RANK_LABELS = ['🥇', '🥈', '🥉'];

const Leaderboard = () => {
  const navigate = useNavigate();
  const [topRestaurants, setTopRestaurants] = useState<RankedUser[]>([]);
  const [topVolunteers, setTopVolunteers] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'restaurants' | 'volunteers'>('restaurants');

  useEffect(() => {
    const fetchLeaderboards = async () => {
      setLoading(true);
      try {
        const { data: donations } = await supabase.from('food_donations').select('restaurant_id');
        const restaurantCounts: Record<string, number> = {};
        donations?.forEach(d => { if (d.restaurant_id) restaurantCounts[d.restaurant_id] = (restaurantCounts[d.restaurant_id] || 0) + 1; });

        const restaurantIds = Object.keys(restaurantCounts);
        if (restaurantIds.length > 0) {
          const { data: rProfiles } = await supabase.from('profiles').select('id, full_name, organization_name, avatar_url').in('id', restaurantIds);
          setTopRestaurants((rProfiles || []).map(p => ({ ...p, full_name: p.full_name || 'Unknown', count: restaurantCounts[p.id] || 0 })).sort((a, b) => b.count - a.count).slice(0, 5));
        } else setTopRestaurants([]);

        const { data: pickups } = await supabase.from('pickup_requests').select('volunteer_id').eq('status', 'delivered').not('volunteer_id', 'is', null);
        const volunteerCounts: Record<string, number> = {};
        pickups?.forEach(p => { if (p.volunteer_id) volunteerCounts[p.volunteer_id] = (volunteerCounts[p.volunteer_id] || 0) + 1; });

        const volunteerIds = Object.keys(volunteerCounts);
        if (volunteerIds.length > 0) {
          const { data: vProfiles } = await supabase.from('profiles').select('id, full_name, organization_name, avatar_url').in('id', volunteerIds);
          setTopVolunteers((vProfiles || []).map(p => ({ ...p, full_name: p.full_name || 'Unknown', count: volunteerCounts[p.id] || 0 })).sort((a, b) => b.count - a.count).slice(0, 5));
        } else setTopVolunteers([]);
      } catch (err) {
        console.error('Leaderboard fetch failed:', err);
        setTopRestaurants([]); setTopVolunteers([]);
      } finally { setLoading(false); }
    };
    fetchLeaderboards();
  }, []);

  const totalDonations = topRestaurants.reduce((s, r) => s + r.count, 0);
  const totalDeliveries = topVolunteers.reduce((s, v) => s + v.count, 0);
  const activeList = activeTab === 'restaurants' ? topRestaurants : topVolunteers;
  const leader = activeList[0];

  const statCards = [
    { label: 'Total Donations',   value: totalDonations,      icon: Package,   bg: 'bg-orange-50 dark:bg-orange-500/10',  iconBg: 'bg-orange-500' },
    { label: 'Total Deliveries',  value: totalDeliveries,     icon: Truck,     bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500' },
    { label: 'Top Restaurants',   value: topRestaurants.length, icon: TrendingUp, bg: 'bg-sky-50 dark:bg-sky-500/10',     iconBg: 'bg-sky-500' },
    { label: 'Active Volunteers', value: topVolunteers.length, icon: Users,    bg: 'bg-violet-50 dark:bg-violet-500/10',  iconBg: 'bg-violet-500' },
  ];

  return (
    // ✅ NO DashboardLayout wrapper
    <div className="space-y-5">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-400 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:h-11 sm:w-11">
            <Trophy className="h-5 w-5 text-white sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Leaderboard</h1>
            <p className="mt-0.5 text-sm text-white/70">Celebrating top contributors in the fight against food waste</p>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {statCards.map((c) => (
          <StaggerItem key={c.label}>
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`rounded-2xl border border-border/60 ${c.bg} p-4 shadow-sm sm:p-5`}
            >
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${c.iconBg}`}>
                <c.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{c.value}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">{c.label}</div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ── Main Content ── */}
      <div className="grid gap-4 sm:gap-5 xl:grid-cols-[280px_1fr]">

        {/* Leader Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="p-5 text-center sm:p-6">
              {/* Crown */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg sm:h-20 sm:w-20">
                <Crown className="h-8 w-8 text-white sm:h-10 sm:w-10" />
              </div>

              <div className="mb-1 text-4xl font-bold text-foreground sm:text-5xl">#1</div>

              {/* Avatar */}
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted sm:h-16 sm:w-16">
                {leader?.avatar_url ? (
                  <img src={leader.avatar_url} alt={leader.full_name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground sm:text-2xl">
                    {(leader?.full_name?.[0] || '?').toUpperCase()}
                  </span>
                )}
              </div>

              <h2 className="mb-0.5 truncate text-lg font-bold text-foreground sm:text-xl">
                {leader?.organization_name || leader?.full_name || 'No Leader Yet'}
              </h2>
              {leader?.organization_name && (
                <p className="mb-3 text-xs text-muted-foreground">{leader.full_name}</p>
              )}

              {/* Score */}
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/40 py-4">
                <div className="text-3xl font-bold text-foreground sm:text-4xl">{leader?.count || 0}</div>
                <div className="mt-0.5 text-xs uppercase tracking-widest text-muted-foreground">
                  {activeTab === 'restaurants' ? 'Donations' : 'Deliveries'}
                </div>
              </div>

              <Button
                onClick={() => leader && navigate('/dashboard')}
                disabled={!leader}
                className="h-10 w-full rounded-xl bg-amber-500 hover:bg-amber-600 sm:h-11"
              >
                View Details <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rankings List */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span className="h-8 w-1 rounded-full bg-emerald-500" />
                Top {activeTab === 'restaurants' ? 'Restaurants' : 'Volunteers'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Ranked by total contributions</CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'restaurants' | 'volunteers')}>
                <TabsList className="mb-4 grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="restaurants" className="rounded-lg text-xs sm:text-sm">🍽️ Restaurants</TabsTrigger>
                  <TabsTrigger value="volunteers" className="rounded-lg text-xs sm:text-sm">🤝 Volunteers</TabsTrigger>
                </TabsList>

                {(['restaurants', 'volunteers'] as const).map(tab => (
                  <TabsContent key={tab} value={tab} className="mt-0">
                    {loading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
                      </div>
                    ) : (tab === 'restaurants' ? topRestaurants : topVolunteers).length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                        <Trophy className="mb-3 h-10 w-10 text-muted-foreground opacity-30" />
                        <p className="text-sm font-medium text-foreground">No rankings yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tab === 'restaurants' ? 'Post donations to appear here' : 'Complete deliveries to appear here'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(tab === 'restaurants' ? topRestaurants : topVolunteers).map((item, index) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -1 }}
                            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-4"
                          >
                            {/* Rank */}
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg font-bold sm:h-11 sm:w-11 sm:text-xl"
                              style={{ background: index < 3 ? `${RANK_COLORS[index]}20` : 'hsl(var(--muted))' }}
                            >
                              {index < 3 ? RANK_LABELS[index] : `#${index + 1}`}
                            </div>

                            {/* Avatar */}
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted sm:h-11 sm:w-11">
                              {item.avatar_url ? (
                                <img src={item.avatar_url} alt={item.full_name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground sm:text-base">
                                  {(item.full_name?.[0] || '?').toUpperCase()}
                                </span>
                              )}
                            </div>

                            {/* Name */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {item.organization_name || item.full_name}
                              </p>
                              {item.organization_name && (
                                <p className="truncate text-xs text-muted-foreground">{item.full_name}</p>
                              )}
                            </div>

                            {/* Count */}
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xl font-bold text-foreground sm:text-2xl">{item.count}</div>
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                                {tab === 'restaurants' ? 'donations' : 'deliveries'}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── CTA ── */}
      <div className="flex justify-center pb-4">
        <Button onClick={() => navigate('/dashboard')} className="h-11 gap-2 rounded-xl bg-emerald-500 px-6 hover:bg-emerald-600">
          <Utensils className="h-4 w-4" />
          Go to Donations
        </Button>
      </div>
    </div>
  );
};

export default Leaderboard;