import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Truck, CheckCircle, MapPin, Package,
  Clock3, RefreshCw, ShieldCheck, HandHeart,
} from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';
import PhotoVerification from '@/components/PhotoVerification';
import { motion } from 'framer-motion';

type PickupTask = {
  id: string;
  donation_id: string;
  ngo_id?: string | null;
  volunteer_id?: string | null;
  status: 'pending' | 'accepted' | 'in_transit' | 'delivered';
  pickup_photo_url?: string | null;
  delivery_photo_url?: string | null;
  created_at?: string;
  food_donations?: {
    id: string;
    food_name?: string;
    quantity?: number;
    location?: string;
    address?: string;
    restaurant_id?: string;
  } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',     dot: 'bg-amber-500' },
  accepted:   { label: 'Accepted',   color: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',             dot: 'bg-sky-500' },
  in_transit: { label: 'In Transit', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500' },
  delivered:  { label: 'Delivered',  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
};

const VolunteerDashboard = () => {
  const { user, profile } = useAuth();

  const [availableTasks, setAvailableTasks] = useState<PickupTask[]>([]);
  const [myTasks, setMyTasks] = useState<PickupTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      const { data: available, error: availableError } = await supabase
        .from('pickup_requests')
        .select('*, food_donations(*)')
        .is('volunteer_id', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (availableError) toast.error('Failed to load available tasks');
      else setAvailableTasks((available || []) as PickupTask[]);

      if (!user) { setMyTasks([]); return; }

      const { data: mine, error: mineError } = await supabase
        .from('pickup_requests')
        .select('*, food_donations(*)')
        .eq('volunteer_id', user.id)
        .order('created_at', { ascending: false });

      if (mineError) toast.error('Failed to load your tasks');
      else setMyTasks((mine || []) as PickupTask[]);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    const channel = supabase
      .channel('volunteer-pickup-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickup_requests' }, () => fetchTasks(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const stats = useMemo(() => ({
    available: availableTasks.length,
    active: myTasks.filter((t) => t.status !== 'delivered').length,
    inTransit: myTasks.filter((t) => t.status === 'in_transit').length,
    completed: myTasks.filter((t) => t.status === 'delivered').length,
  }), [availableTasks, myTasks]);

  const acceptTask = async (requestId: string) => {
    if (!user) return;
    const task = availableTasks.find((t) => t.id === requestId);
    if (!task) return;
    try {
      setActionId(requestId);
      const { error } = await supabase
        .from('pickup_requests')
        .update({ volunteer_id: user.id, status: 'accepted' })
        .eq('id', requestId);
      if (error) { toast.error('Failed to accept task'); return; }
      if (task?.ngo_id) await sendNotification({ event_type: 'pickup_status_changed', user_id: task.ngo_id, donation_id: task.donation_id, message: `A volunteer has accepted the pickup for "${task.food_donations?.food_name}".` });
      if (task?.food_donations?.restaurant_id) await sendNotification({ event_type: 'pickup_status_changed', user_id: task.food_donations.restaurant_id, donation_id: task.donation_id, message: `A volunteer is on the way to pick up "${task.food_donations?.food_name}".` });
      toast.success('Task accepted!');
      fetchTasks(true);
    } finally { setActionId(null); }
  };

  const updateStatus = async (requestId: string, donationId: string, status: 'in_transit' | 'delivered') => {
    const task = myTasks.find((t) => t.id === requestId);
    if (!task) return;
    if (status === 'in_transit' && !task.pickup_photo_url) { toast.error('Please upload a pickup photo first'); return; }
    if (status === 'delivered' && !task.delivery_photo_url) { toast.error('Please upload a delivery photo first'); return; }
    try {
      setActionId(requestId);
      const { error } = await supabase.from('pickup_requests').update({ status }).eq('id', requestId);
      if (error) { toast.error('Failed to update status'); return; }
      await supabase.from('food_donations').update({ status: status === 'delivered' ? 'delivered' : 'picked_up' }).eq('id', donationId);
      if (task?.ngo_id) await sendNotification({ event_type: status === 'delivered' ? 'donation_delivered' : 'pickup_status_changed', user_id: task.ngo_id, donation_id: donationId, message: `Pickup for "${task.food_donations?.food_name}" is now "${status.replace('_', ' ')}".` });
      if (status === 'delivered' && task?.food_donations?.restaurant_id) await sendNotification({ event_type: 'donation_delivered', user_id: task.food_donations.restaurant_id, donation_id: donationId, message: `Your donation "${task.food_donations?.food_name}" has been delivered!` });
      toast.success(status === 'in_transit' ? 'Marked as in transit' : 'Marked as delivered ✅');
      fetchTasks(true);
    } finally { setActionId(null); }
  };

  const handlePhotoUploaded = (requestId: string, type: 'pickup' | 'delivery', url: string) => {
    setMyTasks((prev) => prev.map((t) => t.id === requestId ? { ...t, [type === 'pickup' ? 'pickup_photo_url' : 'delivery_photo_url']: url } : t));
  };

  const statCards = [
    { label: 'Available Tasks', value: stats.available, icon: Package,      bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500' },
    { label: 'Active Tasks',    value: stats.active,    icon: Truck,        bg: 'bg-sky-50 dark:bg-sky-500/10',     iconBg: 'bg-sky-500' },
    { label: 'In Transit',      value: stats.inTransit, icon: Clock3,       bg: 'bg-violet-50 dark:bg-violet-500/10', iconBg: 'bg-violet-500' },
    { label: 'Completed',       value: stats.completed, icon: CheckCircle,  bg: 'bg-amber-50 dark:bg-amber-500/10',  iconBg: 'bg-amber-500' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Hero Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-5 shadow-lg sm:p-6"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:h-9 sm:w-9">
                <HandHeart className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <span className="text-sm font-medium text-white/80">
                {profile?.full_name || 'Volunteer'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Volunteer Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Accept tasks · complete pickups · make a difference
            </p>
          </div>

          <Button
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="h-10 gap-2 rounded-xl bg-white px-4 font-semibold text-emerald-600 shadow-md hover:bg-white/90 sm:h-11 sm:px-5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {statCards.map((item) => (
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

      {/* ── Two Column Grid ── */}
      <div className="grid gap-4 xl:grid-cols-2">

        {/* Available Tasks */}
        <FadeInSection delay={0.1}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Package className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Available Pickup Tasks</CardTitle>
                  <CardDescription className="text-xs">Tasks waiting for a volunteer</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {availableTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Package className="h-7 w-7 text-emerald-500" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No pickup tasks available</h3>
                  <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                    New requests from NGOs will appear here when ready.
                  </p>
                  <Button variant="outline" className="mt-5 rounded-xl" size="sm" onClick={() => fetchTasks(true)}>
                    Check Again
                  </Button>
                </div>
              ) : (
                <StaggerContainer className="space-y-3">
                  {availableTasks.map((task) => {
                    const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
                    return (
                      <StaggerItem key={task.id}>
                        <motion.div
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                  {task.food_donations?.food_name || 'Unnamed donation'}
                                </h3>
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                  {sc.label}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Package className="h-3.5 w-3.5" />{task.food_donations?.quantity || 0} meals
                                </span>
                                <span className="inline-flex items-center gap-1 truncate">
                                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                  {task.food_donations?.address || task.food_donations?.location || 'Location unavailable'}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => acceptTask(task.id)}
                              disabled={actionId === task.id}
                              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 sm:w-auto"
                            >
                              <Truck className="mr-1.5 h-4 w-4" />
                              {actionId === task.id ? 'Accepting...' : 'Accept Task'}
                            </Button>
                          </div>
                        </motion.div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </CardContent>
          </Card>
        </FadeInSection>

        {/* My Tasks */}
        <FadeInSection delay={0.2}>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10">
                  <Truck className="h-5 w-5 text-sky-500" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">My Tasks</CardTitle>
                  <CardDescription className="text-xs">Your accepted and completed tasks</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
                    <Truck className="h-7 w-7 text-sky-500" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">No active tasks yet</h3>
                  <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                    Accept a pickup task to begin delivery.
                  </p>
                </div>
              ) : (
                <StaggerContainer className="space-y-4">
                  {myTasks.map((task) => {
                    const sc = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
                    return (
                      <StaggerItem key={task.id}>
                        <motion.div
                          whileHover={{ y: -2 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md"
                        >
                          <div className="flex flex-col gap-3">
                            {/* Task info + actions */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-semibold text-foreground sm:text-base">
                                    {task.food_donations?.food_name || 'Unnamed donation'}
                                  </h3>
                                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                    {sc.label}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" />{task.food_donations?.quantity || 0} meals
                                  </span>
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                    {task.food_donations?.address || task.food_donations?.location || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {task.status === 'accepted' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateStatus(task.id, task.food_donations?.id || '', 'in_transit')}
                                    disabled={actionId === task.id}
                                    className="rounded-xl"
                                  >
                                    {actionId === task.id ? 'Updating...' : 'Mark In Transit'}
                                  </Button>
                                )}
                                {task.status === 'in_transit' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(task.id, task.food_donations?.id || '', 'delivered')}
                                    disabled={actionId === task.id}
                                    className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
                                  >
                                    <CheckCircle className="mr-1.5 h-4 w-4" />
                                    {actionId === task.id ? 'Updating...' : 'Mark Delivered'}
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Photo verification */}
                            {task.status !== 'pending' && task.status !== 'delivered' && (
                              <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <div className="mb-2 flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-primary" />
                                  <span className="text-xs font-semibold text-foreground">Verification Required</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {(task.status === 'accepted' || task.status === 'in_transit') && (
                                    <PhotoVerification requestId={task.id} type="pickup" existingUrl={task.pickup_photo_url} onUploaded={(url) => handlePhotoUploaded(task.id, 'pickup', url)} />
                                  )}
                                  {task.status === 'in_transit' && (
                                    <PhotoVerification requestId={task.id} type="delivery" existingUrl={task.delivery_photo_url} onUploaded={(url) => handlePhotoUploaded(task.id, 'delivery', url)} />
                                  )}
                                </div>
                              </div>
                            )}

                            {task.status === 'delivered' && (task.pickup_photo_url || task.delivery_photo_url) && (
                              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                <div className="mb-2 flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Delivery Verified ✅</span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  {task.pickup_photo_url && <PhotoVerification requestId={task.id} type="pickup" existingUrl={task.pickup_photo_url} onUploaded={() => {}} />}
                                  {task.delivery_photo_url && <PhotoVerification requestId={task.id} type="delivery" existingUrl={task.delivery_photo_url} onUploaded={() => {}} />}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </CardContent>
          </Card>
        </FadeInSection>
      </div>
    </div>
  );
};

export default VolunteerDashboard;