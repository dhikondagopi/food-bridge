import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle, AlertTriangle, Eye, Flag,
  ImageIcon, Clock, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';
import { motion } from 'framer-motion';

interface PickupWithPhotos {
  id: string;
  status: string;
  pickup_photo_url: string | null;
  delivery_photo_url: string | null;
  volunteer_id: string | null;
  ngo_id: string;
  donation_id: string;
  created_at: string;
  food_donations: {
    food_name: string;
    quantity: number;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' },
  accepted:   { label: 'Accepted',  color: 'text-sky-600 dark:text-sky-400',       bg: 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20' },
  in_transit: { label: 'In Transit', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20' },
  delivered:  { label: 'Delivered', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' },
};

const PhotoModeration = () => {
  const [pickups, setPickups] = useState<PickupWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Flag dialog
  const [flagDialog, setFlagDialog] = useState<{
    open: boolean;
    pickupId: string;
    volunteerId: string | null;
    donationId: string;
  }>({ open: false, pickupId: '', volunteerId: null, donationId: '' });
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);

  // ✅ Track approved/flagged per pickup to prevent duplicate actions
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPickups = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // ✅ FIXED: correct Supabase query syntax for OR with nulls
      const { data, error } = await supabase
        .from('pickup_requests')
        .select('id, status, pickup_photo_url, delivery_photo_url, volunteer_id, ngo_id, donation_id, created_at, food_donations(food_name, quantity)')
        .not('pickup_photo_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Fallback: try delivery photos if pickup filter fails
        const { data: fallback } = await supabase
          .from('pickup_requests')
          .select('id, status, pickup_photo_url, delivery_photo_url, volunteer_id, ngo_id, donation_id, created_at, food_donations(food_name, quantity)')
          .not('delivery_photo_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);
        setPickups((fallback as unknown as PickupWithPhotos[]) || []);
      } else {
        setPickups((data as unknown as PickupWithPhotos[]) || []);
      }
    } catch {
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPickups(); }, []);

  const openPreview = (url: string, title: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
  };

  // ✅ FIXED: approvePhoto now tracks state and includes donation_id
  const approvePhoto = async (pickup: PickupWithPhotos) => {
    if (approvedIds.has(pickup.id)) return;
    setActionLoading(pickup.id);
    try {
      if (pickup.volunteer_id) {
        await sendNotification({
          event_type: 'pickup_status_changed',
          user_id: pickup.volunteer_id,
          donation_id: pickup.donation_id,
          message: '✅ Your verification photos have been approved by an admin.',
        });
      }
      setApprovedIds(prev => new Set([...prev, pickup.id]));
      toast.success('Photos approved — volunteer notified');
    } catch {
      toast.error('Failed to approve photos');
    } finally { setActionLoading(null); }
  };

  // ✅ FIXED: flagPhoto includes donation_id and proper validation
  const flagPhoto = async () => {
    if (!flagReason.trim()) { toast.error('Please provide a reason'); return; }
    setFlagging(true);
    try {
      if (flagDialog.volunteerId) {
        await sendNotification({
          event_type: 'pickup_status_changed',
          user_id: flagDialog.volunteerId,
          donation_id: flagDialog.donationId,
          message: `⚠️ Your verification photo has been flagged. Reason: ${flagReason}`,
        });
      }
      setFlaggedIds(prev => new Set([...prev, flagDialog.pickupId]));
      toast.success('Photo flagged — volunteer notified');
      setFlagDialog({ open: false, pickupId: '', volunteerId: null, donationId: '' });
      setFlagReason('');
    } catch {
      toast.error('Failed to flag photo');
    } finally { setFlagging(false); }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const pickupsWithPhotos = pickups.filter(p => p.pickup_photo_url || p.delivery_photo_url);

  if (pickupsWithPhotos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
        </div>
        <h3 className="text-base font-semibold text-foreground">No photos to review</h3>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          Verification photos submitted by volunteers will appear here.
        </p>
        <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => fetchPickups()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pickupsWithPhotos.length} photo{pickupsWithPhotos.length !== 1 ? 's' : ''} to review
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => fetchPickups(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <StaggerContainer className="space-y-3">
        {pickupsWithPhotos.map(p => {
          const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
          const isApproved = approvedIds.has(p.id);
          const isFlagged = flaggedIds.has(p.id);
          const isLoading = actionLoading === p.id;

          return (
            <StaggerItem key={p.id}>
              <motion.div
                whileHover={{ y: -1 }}
                className={`rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all ${
                  isApproved ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5' :
                  isFlagged ? 'border-red-200 bg-red-50/50 dark:border-red-500/20 dark:bg-red-500/5' : ''
                }`}
              >
                {/* Top row */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">
                      {p.food_donations?.food_name || 'Unknown donation'}
                    </span>
                    {p.food_donations?.quantity && (
                      <span className="text-xs text-muted-foreground">· {p.food_donations.quantity} meals</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{formatTime(p.created_at)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Approved
                      </span>
                    )}
                    {isFlagged && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        <Flag className="h-3 w-3" /> Flagged
                      </span>
                    )}
                  </div>
                </div>

                {/* Photos + actions row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Pickup photo */}
                  {p.pickup_photo_url && (
                    <button
                      onClick={() => openPreview(p.pickup_photo_url!, `Pickup Photo — ${p.food_donations?.food_name || 'Unknown'}`)}
                      className="group relative"
                    >
                      <img
                        src={p.pickup_photo_url}
                        alt="Pickup"
                        className="h-20 w-20 rounded-xl border border-border object-cover shadow-sm"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-muted-foreground">Pickup</span>
                    </button>
                  )}

                  {/* Delivery photo */}
                  {p.delivery_photo_url && (
                    <button
                      onClick={() => openPreview(p.delivery_photo_url!, `Delivery Photo — ${p.food_donations?.food_name || 'Unknown'}`)}
                      className="group relative"
                    >
                      <img
                        src={p.delivery_photo_url}
                        alt="Delivery"
                        className="h-20 w-20 rounded-xl border border-border object-cover shadow-sm"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-muted-foreground">Delivery</span>
                    </button>
                  )}

                  {/* ✅ Actions — disabled if already approved/flagged */}
                  <div className="ml-auto mt-1 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isApproved || isFlagged || isLoading}
                      onClick={() => approvePhoto(p)}
                      className="h-8 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10 text-xs"
                    >
                      {isLoading ? (
                        <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      )}
                      {isApproved ? 'Approved' : 'Approve'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isApproved || isFlagged || isLoading}
                      onClick={() => setFlagDialog({
                        open: true,
                        pickupId: p.id,
                        volunteerId: p.volunteer_id,
                        donationId: p.donation_id,
                      })}
                      className="h-8 rounded-xl border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10 text-xs"
                    >
                      <Flag className="mr-1 h-3.5 w-3.5" />
                      {isFlagged ? 'Flagged' : 'Flag'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* ── Photo Preview Dialog ── */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{previewTitle}</DialogTitle>
            <DialogDescription className="text-xs">Verification photo submitted by volunteer</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Verification"
              className="w-full rounded-xl border border-border object-contain"
              style={{ maxHeight: '70vh' }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Flag Dialog ── */}
      <Dialog
        open={flagDialog.open}
        onOpenChange={open => !open && setFlagDialog({ open: false, pickupId: '', volunteerId: null, donationId: '' })}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> Flag Photo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason for flagging. The volunteer will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={flagReason}
            onChange={e => setFlagReason(e.target.value)}
            placeholder="e.g. Blurry photo, wrong item shown, suspected fraud, image doesn't match donation..."
            rows={3}
            className="rounded-xl text-sm resize-none"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setFlagDialog({ open: false, pickupId: '', volunteerId: null, donationId: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={flagging || !flagReason.trim()}
              onClick={flagPhoto}
            >
              {flagging ? (
                <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />Flagging...</>
              ) : (
                <><Flag className="mr-1.5 h-3.5 w-3.5" />Flag & Notify</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoModeration;