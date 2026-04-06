import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Search, Trash2, MapPin, Clock, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

interface Donation {
  id: string;
  food_name: string;
  quantity: number;
  food_category: string;
  status: string;
  address: string;
  pickup_time: string;
  created_at: string;
  image_url?: string;
  profiles: { full_name: string; organization_name: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available:  { label: 'Available',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
  reserved:   { label: 'Reserved',   color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  picked_up:  { label: 'Picked Up',  color: 'text-sky-600 dark:text-sky-400',        bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20' },
  delivered:  { label: 'Delivered',  color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20' },
};

const AdminFoodListings = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDonations = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await supabase
        .from('food_donations')
        .select('*, profiles:restaurant_id(full_name, organization_name)')
        .order('created_at', { ascending: false });
      setDonations((data as unknown as Donation[]) || []);
    } catch { toast.error('Failed to load food listings'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchDonations(); }, []);

  const deleteDonation = async (id: string) => {
    if (!window.confirm('Delete this donation permanently?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('food_donations').delete().eq('id', id);
      if (error) throw error;
      setDonations(prev => prev.filter(d => d.id !== id));
      toast.success('Donation deleted');
    } catch { toast.error('Failed to delete donation'); }
    finally { setDeletingId(null); }
  };

  const filteredDonations = donations.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = q === '' ||
      d.food_name?.toLowerCase().includes(q) ||
      d.profiles?.full_name?.toLowerCase().includes(q) ||
      d.address?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: donations.length,
    available: donations.filter(d => d.status === 'available').length,
    delivered: donations.filter(d => d.status === 'delivered').length,
    meals: donations.reduce((s, d) => s + (parseInt(d.quantity as any) || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white/80">Admin</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Food Listings</h1>
            <p className="mt-1 text-sm text-white/70">Manage all food donations across the platform</p>
          </div>
          <Button onClick={() => fetchDonations(true)} disabled={refreshing}
            className="h-9 gap-2 rounded-xl bg-white/20 px-4 text-sm font-medium text-white hover:bg-white/30"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { label: 'Total Listings', value: stats.total,     bg: 'bg-orange-50 dark:bg-orange-500/10',  iconBg: 'bg-orange-500' },
          { label: 'Available',      value: stats.available, bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500' },
          { label: 'Delivered',      value: stats.delivered, bg: 'bg-violet-50 dark:bg-violet-500/10',  iconBg: 'bg-violet-500' },
          { label: 'Total Meals',    value: stats.meals,     bg: 'bg-sky-50 dark:bg-sky-500/10',        iconBg: 'bg-sky-500' },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border border-border/60 ${c.bg} p-4 shadow-sm`}>
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${c.iconBg}`}>
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Utensils className="h-5 w-5" />
              All Donations ({filteredDonations.length}{filteredDonations.length !== donations.length ? ` of ${donations.length}` : ''})
            </CardTitle>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search food, restaurant or location..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-xl pl-9 h-9 text-sm" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-full rounded-xl text-xs sm:w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : filteredDonations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Utensils className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No donations found</p>
            </div>
          ) : (
            <StaggerContainer className="space-y-2">
              {filteredDonations.map(d => {
                const sc = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.available;
                return (
                  <StaggerItem key={d.id}>
                    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition hover:bg-muted/30">
                      {d.image_url ? (
                        <img src={d.image_url} alt={d.food_name} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover border border-border" />
                      ) : (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                          <Utensils className="h-5 w-5 text-orange-500" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{d.food_name}</p>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{d.food_category === 'veg' ? '🥦 Veg' : '🍗 Non-veg'}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Utensils className="h-3 w-3" />{d.quantity} meals</span>
                          <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3 flex-shrink-0" />{d.address || 'No address'}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(d.created_at).toLocaleDateString()}</span>
                          {d.profiles && <span className="text-primary">by {d.profiles.organization_name || d.profiles.full_name}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" disabled={deletingId === d.id} onClick={() => deleteDonation(d.id)}
                        className="h-8 w-8 flex-shrink-0 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        {deletingId === d.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFoodListings;