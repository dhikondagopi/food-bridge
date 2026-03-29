import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, CheckCircle, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/notifications';
import { StaggerContainer, StaggerItem, FadeInSection } from '@/components/motion/StaggerContainer';
import PhotoVerification from '@/components/PhotoVerification';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);

  const fetchTasks = async () => {
    const { data: available } = await supabase
      .from('pickup_requests')
      .select('*, food_donations(*)')
      .is('volunteer_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setAvailableTasks(available || []);

    if (!user) return;
    const { data: mine } = await supabase
      .from('pickup_requests')
      .select('*, food_donations(*)')
      .eq('volunteer_id', user.id)
      .order('created_at', { ascending: false });
    setMyTasks(mine || []);
  };

  useEffect(() => { fetchTasks(); }, [user]);

  // Real-time subscription for pickup_requests changes
  useEffect(() => {
    const channel = supabase
      .channel('volunteer-pickup-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'pickup_requests',
      }, () => { fetchTasks(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const acceptTask = async (requestId: string) => {
    if (!user) return;
    const task = availableTasks.find(t => t.id === requestId);
    await supabase.from('pickup_requests').update({ volunteer_id: user.id, status: 'accepted' }).eq('id', requestId);
    
    // Notify the NGO that a volunteer accepted
    if (task?.ngo_id) {
      sendNotification({
        event_type: 'pickup_status_changed',
        user_id: task.ngo_id,
        donation_id: task.donation_id,
        message: `A volunteer has accepted the pickup for "${task.food_donations?.food_name}".`,
      });
    }
    // Notify the restaurant
    if (task?.food_donations?.restaurant_id) {
      sendNotification({
        event_type: 'pickup_status_changed',
        user_id: task.food_donations.restaurant_id,
        donation_id: task.donation_id,
        message: `A volunteer is on the way to pick up "${task.food_donations?.food_name}".`,
      });
    }
    
    toast.success('Task accepted!');
    fetchTasks();
  };

  const updateStatus = async (requestId: string, donationId: string, status: string) => {
    // Require pickup photo before marking in-transit
    if (status === 'in_transit') {
      const task = myTasks.find(t => t.id === requestId);
      if (!task?.pickup_photo_url) {
        toast.error('Please upload a pickup photo before marking in-transit');
        return;
      }
    }
    // Require delivery photo before marking delivered
    if (status === 'delivered') {
      const task = myTasks.find(t => t.id === requestId);
      if (!task?.delivery_photo_url) {
        toast.error('Please upload a delivery photo before marking delivered');
        return;
      }
    }

    await supabase.from('pickup_requests').update({ status }).eq('id', requestId);
    if (status === 'delivered') {
      await supabase.from('food_donations').update({ status: 'delivered' }).eq('id', donationId);
    } else if (status === 'in_transit') {
      await supabase.from('food_donations').update({ status: 'picked_up' }).eq('id', donationId);
    }
    // Notify the NGO who created the pickup request about the status change
    const task = myTasks.find(t => t.id === requestId);
    if (task?.ngo_id) {
      const eventType = status === 'delivered' ? 'donation_delivered' : 'pickup_status_changed';
      sendNotification({
        event_type: eventType,
        user_id: task.ngo_id,
        donation_id: donationId,
        message: `Pickup for "${task.food_donations?.food_name}" has been updated to "${status.replace('_', ' ')}".`,
      });
    }
    // Also notify the restaurant on delivery
    if (status === 'delivered' && task?.food_donations?.restaurant_id) {
      sendNotification({
        event_type: 'donation_delivered',
        user_id: task.food_donations.restaurant_id,
        donation_id: donationId,
        message: `Your donation "${task.food_donations?.food_name}" has been successfully delivered! 🎉`,
      });
    }
    toast.success(`Status updated to ${status}`);
    fetchTasks();
  };

  const handlePhotoUploaded = (requestId: string, type: 'pickup' | 'delivery', url: string) => {
    setMyTasks(prev =>
      prev.map(t =>
        t.id === requestId
          ? { ...t, [type === 'pickup' ? 'pickup_photo_url' : 'delivery_photo_url']: url }
          : t
      )
    );
  };

  return (
    <div>
      <FadeInSection className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Volunteer Dashboard</h1>
        <p className="text-muted-foreground mt-1">Pick up and deliver food to those in need</p>
      </FadeInSection>

      <StaggerContainer className="grid grid-cols-3 gap-4 mb-8">
        <StaggerItem>
          <Card className="shadow-card"><CardContent className="p-4 text-center">
            <div className="font-heading text-2xl font-bold text-foreground">{availableTasks.length}</div>
            <div className="text-xs text-muted-foreground">Available Tasks</div>
          </CardContent></Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="shadow-card"><CardContent className="p-4 text-center">
            <div className="font-heading text-2xl font-bold text-foreground">{myTasks.filter(t => t.status !== 'delivered').length}</div>
            <div className="text-xs text-muted-foreground">Active Tasks</div>
          </CardContent></Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="shadow-card"><CardContent className="p-4 text-center">
            <div className="font-heading text-2xl font-bold text-foreground">{myTasks.filter(t => t.status === 'delivered').length}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent></Card>
        </StaggerItem>
      </StaggerContainer>

      <FadeInSection delay={0.3}>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Available Pickup Tasks</h2>
      </FadeInSection>
      <StaggerContainer className="space-y-3 mb-10">
        {availableTasks.length === 0 && <p className="text-muted-foreground text-sm">No tasks available right now.</p>}
        {availableTasks.map(t => (
          <StaggerItem key={t.id}>
            <Card className="shadow-card">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{t.food_donations?.food_name}</h3>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                    <span>{t.food_donations?.quantity} meals</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.food_donations?.location}</span>
                  </div>
                </div>
                <Button variant="hero" size="sm" onClick={() => acceptTask(t.id)}>
                  <Truck className="h-4 w-4 mr-1.5" />Accept
                </Button>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeInSection delay={0.35}>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">My Tasks</h2>
      </FadeInSection>
      <StaggerContainer className="space-y-3">
        {myTasks.length === 0 && <p className="text-muted-foreground text-sm">No active tasks.</p>}
        {myTasks.map(t => (
          <StaggerItem key={t.id}>
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{t.food_donations?.food_name}</h3>
                    <div className="flex gap-3 text-sm text-muted-foreground mt-1">
                      <span>{t.food_donations?.quantity} meals</span>
                      <Badge variant="outline" className="capitalize">{t.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {t.status === 'accepted' && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus(t.id, t.food_donations?.id, 'in_transit')}>
                        Mark In Transit
                      </Button>
                    )}
                    {t.status === 'in_transit' && (
                      <Button variant="hero" size="sm" onClick={() => updateStatus(t.id, t.food_donations?.id, 'delivered')}>
                        <CheckCircle className="h-4 w-4 mr-1.5" />Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>

                {/* Photo verification section */}
                {t.status !== 'pending' && t.status !== 'delivered' && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground font-medium">Verification:</span>
                    {(t.status === 'accepted' || t.status === 'in_transit') && (
                      <PhotoVerification
                        requestId={t.id}
                        type="pickup"
                        existingUrl={t.pickup_photo_url}
                        onUploaded={(url) => handlePhotoUploaded(t.id, 'pickup', url)}
                      />
                    )}
                    {t.status === 'in_transit' && (
                      <PhotoVerification
                        requestId={t.id}
                        type="delivery"
                        existingUrl={t.delivery_photo_url}
                        onUploaded={(url) => handlePhotoUploaded(t.id, 'delivery', url)}
                      />
                    )}
                  </div>
                )}

                {/* Show photos for completed tasks */}
                {t.status === 'delivered' && (t.pickup_photo_url || t.delivery_photo_url) && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground font-medium">Verified:</span>
                    {t.pickup_photo_url && (
                      <PhotoVerification
                        requestId={t.id}
                        type="pickup"
                        existingUrl={t.pickup_photo_url}
                        onUploaded={() => {}}
                      />
                    )}
                    {t.delivery_photo_url && (
                      <PhotoVerification
                        requestId={t.id}
                        type="delivery"
                        existingUrl={t.delivery_photo_url}
                        onUploaded={() => {}}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
};

export default VolunteerDashboard;
