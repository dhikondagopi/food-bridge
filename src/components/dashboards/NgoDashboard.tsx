import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package, Truck, CheckCircle, Search, Plus, MapPin,
  Clock, Utensils, Users, RefreshCw, Building2, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

type Donation = {
  id: string;
  food_name?: string;
  quantity?: number;
  location?: string;
  address?: string;
  status: string;
  food_category?: string;
  pickup_time?: string;
  created_at?: string;
  image_url?: string;
};

type PickupRequest = {
  id: string;
  donation_id: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'delivered';
  volunteer_id?: string | null;
  ngo_id?: string | null;
  created_at?: string;
  food_donations?: Donation | null;
};

const REQUEST_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',   dot: 'bg-amber-500' },
  accepted:   { label: 'Accepted',   color: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',           dot: 'bg-sky-500' },
  in_transit: { label: 'In Transit', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500' },
  delivered:  { label: 'Delivered',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
};

const NgoDashboard = () => {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      if (!user) { setDonations([]); setPickupRequests([]); return; }

      // ✅ FIXED: status is 'available' not 'pending'
      const { data: restaurantDonations, error: donationsError } = await supabase
        .from('food_donations')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (donationsError) toast.error('Failed to load donations');
      else setDonations(restaurantDonations || []);

      const { data: requests, error: requestsError } = await supabase
        .from('pickup_requests')
        .select('*, food_donations(*)')
        .eq('ngo_id', user.id)
        .order('created_at', { ascending: false });

      if (requestsError) toast.error('Failed to load requests');
      else setPickupRequests(requests || []);

    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channels = [
      supabase.channel('ngo-donations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'food_donations' }, () => fetchData(true))
        .subscribe(),
      supabase.channel('ngo-requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests' }, () => fetchData(true))
        .subscribe(),
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [fetchData]);

  const requestedDonationIds = new Set(pickupRequests.map(r => r.donation_id));
  const availableDonations = donations.filter(d => !requestedDonationIds.has(d.id));
  const filteredDonations = searchTerm
    ? availableDonations.filter(d =>
        d.food_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.address?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableDonations;

  const stats = [
    { label: 'Available', value: availableDonations.length, icon: Package, bg: 'bg-sky-50 dark:bg-sky-500/10', iconBg: 'bg-sky-500' },
    { label: 'Pending', value: pickupRequests.filter(r => r.status === 'pending').length, icon: Clock, bg: 'bg-amber-50 dark:bg-amber-500/10', iconBg: 'bg-amber-500' },
    { label: 'In Transit', value: pickupRequests.filter(r => ['accepted','in_transit'].includes(r.status)).length, icon: Truck, bg: 'bg-violet-50 dark:bg-violet-500/10', iconBg: 'bg-violet-500' },
    { label: 'Delivered', value: pickupRequests.filter(r => r.status === 'delivered').length, icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500' },
  ];

  const requestPickup = async (donationId: string) => {
    if (!user) return;
    setRequestingId(donationId);
    try {
      const { error } = await supabase.from('pickup_requests').insert({
        ngo_id: user.id,
        donation_id: donationId,
        status: 'pending',
      });
      if (error) throw error;
      toast.success('Pickup request created!');
      fetchData(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create request');
    } finally {
      setRequestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:h-9 sm:w-9">
                <Building2 className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <span className="text-sm font-medium text-white/80">
                {profile?.organization_name || profile?.full_name || 'NGO'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              NGO Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Browse donations · request pickups · track deliveries
            </p>
          </div>

          <Button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="h-10 gap-2 rounded-xl bg-white px-4 font-semibold text-sky-600 shadow-md hover:bg-white/90 sm:h-11 sm:px-5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((item) => (
          <StaggerItem key={item.label}>
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`relative overflow-hidden rounded-2xl border border-border/60 ${item.bg} p-4 shadow-sm sm:p-5`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${item.iconBg} sm:h-9 sm:w-9`}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{item.value}</div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ── Available Donations ── */}
      <div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Available Food Donations</h2>
            <p className="text-xs text-muted-foreground">{filteredDonations.length} donations ready for pickup</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search food or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>
        </div>

        {filteredDonations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-14 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
              <Utensils className="h-7 w-7 text-sky-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              {searchTerm ? 'No matching donations' : 'No donations available'}
            </h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {searchTerm ? 'Try a different search term.' : 'Check back later for new restaurant donations.'}
            </p>
          </motion.div>
        ) : (
          <StaggerContainer className="space-y-3">
            {filteredDonations.map((donation) => (
              <StaggerItem key={donation.id}>
                <motion.div
                  whileHover={{ y: -2 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      {donation.image_url ? (
                        <img src={donation.image_url} alt={donation.food_name} className="h-14 w-14 flex-shrink-0 rounded-xl border border-border object-cover sm:h-16 sm:w-16" />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-sky-500/10 sm:h-16 sm:w-16">
                          <Utensils className="h-5 w-5 text-sky-500 sm:h-6 sm:w-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">{donation.food_name}</h3>
                          {donation.food_category && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {donation.food_category === 'veg' ? '🥦 Veg' : '🍗 Non-veg'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />{donation.quantity} meals
                          </span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            {donation.address || donation.location}
                          </span>
                          {donation.pickup_time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(donation.pickup_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => requestPickup(donation.id)}
                      disabled={requestingId === donation.id}
                      className="w-full rounded-xl bg-sky-500 hover:bg-sky-600 sm:w-auto"
                      size="sm"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      {requestingId === donation.id ? 'Requesting...' : 'Request Pickup'}
                    </Button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* ── Pickup Requests ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">My Pickup Requests</h2>
          <p className="text-xs text-muted-foreground">Track status of your requests</p>
        </div>

        {pickupRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-14 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No requests yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Request a pickup from the available donations above.
            </p>
          </div>
        ) : (
          <StaggerContainer className="space-y-3">
            {pickupRequests.slice(0, 10).map((request) => {
              const sc = REQUEST_STATUS_CONFIG[request.status] ?? REQUEST_STATUS_CONFIG.pending;
              return (
                <StaggerItem key={request.id}>
                  <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Truck className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {request.food_donations?.food_name || 'Food donation'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.food_donations?.quantity || 0} meals · {new Date(request.created_at!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </div>
  );
};

export default NgoDashboard;