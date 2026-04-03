import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import type { FoodDonation } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Plus,
  Trash2,
  ImagePlus,
  X,
  Utensils,
  Clock,
  MapPin,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  Leaf,
  ChefHat,
  ArrowUpRight,
  Flame,
} from 'lucide-react';

import LocationPicker from '@/components/LocationPicker';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StaggerContainer,
  StaggerItem,
} from '@/components/motion/StaggerContainer';

type DonationStatus = 'available' | 'reserved' | 'picked_up' | 'delivered';
type FoodCategory = 'veg' | 'non-veg';

type DonationFormState = {
  food_name: string;
  quantity: number;
  food_category: FoodCategory;
  preparation_time: string;
  expiry_time: string;
  pickup_time: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
};

const initialForm: DonationFormState = {
  food_name: '',
  quantity: 1,
  food_category: 'veg',
  preparation_time: '',
  expiry_time: '',
  pickup_time: '',
  description: '',
  address: '',
  latitude: 28.6139,
  longitude: 77.209,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available: {
    label: 'Available',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  reserved: {
    label: 'Reserved',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    dot: 'bg-amber-500',
  },
  picked_up: {
    label: 'Picked Up',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20',
    dot: 'bg-sky-500',
  },
  delivered: {
    label: 'Delivered',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
    dot: 'bg-violet-500',
  },
};

const RestaurantDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();

  const [donations, setDonations] = useState<FoodDonation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DonationFormState>(initialForm);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDonations = useCallback(async () => {
    if (!user) { setDonations([]); setLoadingDonations(false); return; }
    setLoadingDonations(true);
    const { data, error } = await supabase
      .from('food_donations')
      .select('*')
      .eq('restaurant_id', user.id)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load donations'); setLoadingDonations(false); return; }
    setDonations((data as FoodDonation[]) || []);
    setLoadingDonations(false);
  }, [user]);

  useEffect(() => { fetchDonations(); }, [fetchDonations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`restaurant-donation-changes-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_donations', filter: `restaurant_id=eq.${user.id}` }, () => fetchDonations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchDonations]);

  useEffect(() => {
    return () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const stats = useMemo(() => {
    const total = donations.length;
    const available = donations.filter((d) => d.status === 'available').length;
    const reserved = donations.filter((d) => d.status === 'reserved').length;
    const pickedUp = donations.filter((d) => d.status === 'picked_up').length;
    const delivered = donations.filter((d) => d.status === 'delivered').length;
    const deliveryRate = total ? Math.round((delivered / total) * 100) : 0;
    const totalMeals = donations.reduce((acc, d) => acc + (d.quantity || 0), 0);
    return { total, available, reserved, pickedUp, delivered, deliveryRate, totalMeals };
  }, [donations]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile || !user) return null;
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('food-images').upload(filePath, imageFile);
    if (error) { toast.error('Image upload failed'); return null; }
    const { data } = supabase.storage.from('food-images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const resetForm = () => { setForm(initialForm); clearImage(); setShowForm(false); };

  const validateForm = () => {
    if (!form.food_name.trim()) { toast.error('Food name is required'); return false; }
    if (!form.address.trim()) { toast.error('Pickup address is required'); return false; }
    if (form.quantity < 1) { toast.error('Quantity must be at least 1'); return false; }
    if (!form.preparation_time || !form.expiry_time || !form.pickup_time) { toast.error('Please fill all date and time fields'); return false; }
    if (new Date(form.expiry_time) <= new Date(form.preparation_time)) { toast.error('Expiry time must be after preparation time'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting || !validateForm()) return;
    setSubmitting(true);
    try {
      const image_url = await uploadImage();
      const payload: Record<string, unknown> = {
        food_name: form.food_name.trim(),
        quantity: form.quantity,
        food_category: form.food_category,
        preparation_time: form.preparation_time,
        expiry_time: form.expiry_time,
        pickup_time: form.pickup_time,
        description: form.description.trim() || null,
        location: form.address.trim(),   // maps to DB column 'location'
        address: form.address.trim(),    // maps to DB column 'address'
        latitude: form.latitude,
        longitude: form.longitude,
        restaurant_id: user.id,
        status: 'available' as DonationStatus,
      };
      if (image_url) payload.image_url = image_url;
      const { error } = await supabase.from('food_donations').insert([payload]);
      if (error) { console.error('Insert error:', error); toast.error(`Failed to create donation: ${error.message}`); return; }
      toast.success('Food donation posted successfully');
      await sendNotification({ event_type: 'donation_created', notify_role: 'ngo', message: `New food donation "${form.food_name}" (${form.quantity} meals) is available for pickup at ${form.address}.` });
      resetForm(); fetchDonations();
    } catch { toast.error('Something went wrong while posting the donation'); }
    finally { setSubmitting(false); }
  };

  const deleteDonation = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this donation?')) return;
    const { error } = await supabase.from('food_donations').delete().eq('id', id);
    if (error) { toast.error('Failed to delete donation'); return; }
    toast.success('Donation deleted'); fetchDonations();
  };

  const statCards = [
    { label: 'Total Donations', value: stats.total, icon: Utensils, accent: 'from-orange-500 to-amber-500', bg: 'bg-orange-50 dark:bg-orange-500/10', iconBg: 'bg-orange-500', trend: '+12%' },
    { label: 'Available Now', value: stats.available, icon: Leaf, accent: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', iconBg: 'bg-emerald-500', trend: 'Live' },
    { label: 'Meals Donated', value: stats.totalMeals, icon: Flame, accent: 'from-sky-500 to-blue-500', bg: 'bg-sky-50 dark:bg-sky-500/10', iconBg: 'bg-sky-500', trend: 'Total' },
    { label: 'Delivered', value: stats.delivered, icon: CheckCircle2, accent: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-500/10', iconBg: 'bg-violet-500', trend: `${stats.deliveryRate}%` },
  ];

  if (authLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2"><Skeleton className="h-9 w-72" /><Skeleton className="h-4 w-48" /></div>
          <Skeleton className="h-11 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 p-6 shadow-lg"
      >
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 right-24 h-32 w-32 rounded-full bg-white/10 blur-xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <ChefHat className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-white/80">
                {profile?.organization_name || profile?.full_name || 'Restaurant'}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Restaurant Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Manage food donations · track pickups · reduce waste
            </p>
          </div>

          <Button
            onClick={() => setShowForm((prev) => !prev)}
            className="h-11 gap-2 rounded-xl bg-white px-5 font-semibold text-orange-600 shadow-md hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancel' : 'New Donation'}
          </Button>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((item) => (
          <StaggerItem key={item.label}>
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className={`relative overflow-hidden rounded-2xl border border-border/60 ${item.bg} p-5 shadow-sm`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
                  {item.trend}
                </span>
              </div>
              <div className="text-3xl font-bold tracking-tight text-foreground">{item.value}</div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* ── Delivery Performance ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Delivery Performance</h3>
              <p className="text-xs text-muted-foreground">
                {stats.delivered} of {stats.total} donations delivered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:min-w-[260px]">
            <Progress value={stats.deliveryRate} className="h-2.5 flex-1" />
            <span className="min-w-[44px] text-right text-sm font-bold text-foreground">
              {stats.deliveryRate}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── New Donation Form ── */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
                    <Plus className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Post New Food Donation</CardTitle>
                    <CardDescription>Add details so nearby NGOs can view and reserve it.</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">

                  <div className="space-y-2">
                    <Label htmlFor="food_name" className="text-sm font-medium">Food Name</Label>
                    <Input id="food_name" value={form.food_name} onChange={(e) => setForm((p) => ({ ...p, food_name: e.target.value }))} placeholder="e.g. Veg Biryani" className="rounded-xl" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm font-medium">Quantity (meals)</Label>
                    <Input id="quantity" type="number" min={1} value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) || 1 }))} className="rounded-xl" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="food_category" className="text-sm font-medium">Category</Label>
                    <select id="food_category" value={form.food_category} onChange={(e) => setForm((p) => ({ ...p, food_category: e.target.value as FoodCategory }))} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="veg">🥦 Vegetarian</option>
                      <option value="non-veg">🍗 Non-Vegetarian</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preparation_time" className="text-sm font-medium">Preparation Time</Label>
                    <Input id="preparation_time" type="datetime-local" value={form.preparation_time} onChange={(e) => setForm((p) => ({ ...p, preparation_time: e.target.value }))} className="rounded-xl" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry_time" className="text-sm font-medium">Expiry Time</Label>
                    <Input id="expiry_time" type="datetime-local" value={form.expiry_time} onChange={(e) => setForm((p) => ({ ...p, expiry_time: e.target.value }))} className="rounded-xl" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pickup_time" className="text-sm font-medium">Pickup Time</Label>
                    <Input id="pickup_time" type="datetime-local" value={form.pickup_time} onChange={(e) => setForm((p) => ({ ...p, pickup_time: e.target.value }))} className="rounded-xl" required />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="text-sm font-medium">Pickup Address</Label>
                    <Input id="address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Full pickup address" className="rounded-xl" required />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Pickup Location on Map</Label>
                    <div className="rounded-xl border border-border/70 p-2">
                      <LocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lng) => setForm((p) => ({ ...p, latitude: lat, longitude: lng }))} onAddressChange={(address) => setForm((p) => ({ ...p, address }))} />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Packaging notes, freshness info, special instructions..." className="rounded-xl" />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-medium">Food Photo</Label>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Selected food preview" className="h-36 w-36 rounded-2xl border border-border object-cover shadow" />
                        <button type="button" onClick={clearImage} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow" aria-label="Remove image">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-36 w-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition hover:border-orange-400 hover:text-orange-500">
                        <ImagePlus className="h-7 w-7" />
                        <span className="text-xs font-medium">Add Photo</span>
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3 md:col-span-2">
                    <Button type="submit" disabled={submitting} className="rounded-xl bg-orange-500 px-6 hover:bg-orange-600">
                      {submitting ? 'Posting...' : 'Post Donation'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} disabled={submitting} className="rounded-xl">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Donations List ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Recent Donations</h2>
            <p className="text-xs text-muted-foreground">Live updates · {donations.length} total</p>
          </div>
          {donations.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </div>
          )}
        </div>

        {loadingDonations ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : donations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10">
              <Utensils className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No donations yet</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Post your first donation to notify NGOs and start rescuing surplus food today.
            </p>
            <Button onClick={() => setShowForm(true)} className="mt-6 rounded-xl bg-orange-500 hover:bg-orange-600">
              <Plus className="mr-2 h-4 w-4" />
              Create First Donation
            </Button>
          </motion.div>
        ) : (
          <StaggerContainer className="space-y-3">
            {donations.map((donation) => {
              const sc = STATUS_CONFIG[donation.status] ?? STATUS_CONFIG.available;
              return (
                <StaggerItem key={donation.id}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="group rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left: image + info */}
                      <div className="flex min-w-0 flex-1 gap-4">
                        {donation.image_url ? (
                          <img src={donation.image_url} alt={donation.food_name} className="h-16 w-16 flex-shrink-0 rounded-xl border border-border object-cover" />
                        ) : (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-orange-500/10">
                            <Utensils className="h-6 w-6 text-orange-500" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-foreground">{donation.food_name}</h3>
                            {/* Status badge */}
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                              {sc.label}
                            </span>
                            {donation.food_category && (
                              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                {donation.food_category === 'veg' ? '🥦 Veg' : '🍗 Non-veg'}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Utensils className="h-3.5 w-3.5" />
                              {donation.quantity} meals
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(donation.pickup_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                            <span className="inline-flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {donation.address || donation.location}
                            </span>
                          </div>

                          {donation.description && (
                            <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{donation.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: delete */}
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => deleteDonation(donation.id)}
                          aria-label="Delete donation"
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;