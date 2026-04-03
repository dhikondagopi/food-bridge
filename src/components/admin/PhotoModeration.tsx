import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertTriangle, Eye, Flag, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { StaggerContainer, StaggerItem } from '@/components/motion/StaggerContainer';

interface PickupWithPhotos {
  id: string;
  status: string;
  pickup_photo_url: string | null;
  delivery_photo_url: string | null;
  volunteer_id: string | null;
  ngo_id: string;
  created_at: string;
  food_donations: {
    food_name: string;
    quantity: number;
  } | null;
}

const PhotoModeration = () => {
  const [pickups, setPickups] = useState<PickupWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [flagDialog, setFlagDialog] = useState<{ open: boolean; pickupId: string; volunteerId: string | null }>({ open: false, pickupId: '', volunteerId: null });
  const [flagReason, setFlagReason] = useState('');

  const fetchPickups = async () => {
    const { data } = await supabase
      .from('pickup_requests')
      .select('id, status, pickup_photo_url, delivery_photo_url, volunteer_id, ngo_id, created_at, food_donations(food_name, quantity)')
      .or('pickup_photo_url.neq.,delivery_photo_url.neq.')
      .order('created_at', { ascending: false })
      .limit(50);
    setPickups((data as unknown as PickupWithPhotos[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPickups(); }, []);

  const openPreview = (url: string, title: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
  };

  const flagPhoto = async () => {
    if (!flagReason.trim()) { toast.error('Please provide a reason'); return; }
    
    // Notify volunteer about the flagged photo
    if (flagDialog.volunteerId) {
      await sendNotification({
        event_type: 'pickup_status_changed',
        user_id: flagDialog.volunteerId,
        message: `⚠️ Your verification photo has been flagged by an admin. Reason: ${flagReason}`,
      });
    }
    
    toast.success('Photo flagged and volunteer notified');
    setFlagDialog({ open: false, pickupId: '', volunteerId: null });
    setFlagReason('');
  };

  const approvePhoto = async (pickupId: string, volunteerId: string | null) => {
    if (volunteerId) {
      await sendNotification({
        event_type: 'pickup_status_changed',
        user_id: volunteerId,
        message: '✅ Your verification photos have been approved by an admin.',
      });
    }
    toast.success('Photos approved');
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading photos...</div>;

  const pickupsWithPhotos = pickups.filter(p => p.pickup_photo_url || p.delivery_photo_url);

  if (pickupsWithPhotos.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          No verification photos to review yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <StaggerContainer className="space-y-3">
        {pickupsWithPhotos.map(p => (
          <StaggerItem key={p.id}>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-foreground">{p.food_donations?.food_name || 'Unknown'}</span>
                    <span className="text-sm text-muted-foreground ml-2">{p.food_donations?.quantity} meals</span>
                  </div>
                  <Badge variant="outline" className="capitalize">{p.status.replace('_', ' ')}</Badge>
                </div>

                <div className="flex items-center gap-3">
                  {p.pickup_photo_url && (
                    <button
                      onClick={() => openPreview(p.pickup_photo_url!, `Pickup Photo - ${p.food_donations?.food_name}`)}
                      className="relative group"
                    >
                      <img src={p.pickup_photo_url} alt="Pickup" className="h-20 w-20 rounded-lg object-cover border border-border" />
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <span className="absolute -bottom-1 left-0 right-0 text-center text-[10px] text-muted-foreground">Pickup</span>
                    </button>
                  )}
                  {p.delivery_photo_url && (
                    <button
                      onClick={() => openPreview(p.delivery_photo_url!, `Delivery Photo - ${p.food_donations?.food_name}`)}
                      className="relative group"
                    >
                      <img src={p.delivery_photo_url} alt="Delivery" className="h-20 w-20 rounded-lg object-cover border border-border" />
                      <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <span className="absolute -bottom-1 left-0 right-0 text-center text-[10px] text-muted-foreground">Delivery</span>
                    </button>
                  )}

                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-success border-success/30 hover:bg-success/10"
                      onClick={() => approvePhoto(p.id, p.volunteer_id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setFlagDialog({ open: true, pickupId: p.id, volunteerId: p.volunteer_id })}
                    >
                      <Flag className="h-3.5 w-3.5 mr-1" /> Flag
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Photo Preview */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Verification photo for review</DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <img src={previewUrl} alt="Verification" className="w-full rounded-lg border border-border" />
          )}
        </DialogContent>
      </Dialog>

      {/* Flag Dialog */}
      <Dialog open={flagDialog.open} onOpenChange={(open) => !open && setFlagDialog({ open: false, pickupId: '', volunteerId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Flag Photo
            </DialogTitle>
            <DialogDescription>
              Provide a reason for flagging this photo. The volunteer will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Reason for flagging (e.g., blurry photo, wrong item, suspected fraud...)"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setFlagDialog({ open: false, pickupId: '', volunteerId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={flagPhoto}>
              Flag & Notify
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoModeration;
