import { supabase } from '@/lib/supabase';

interface NotificationPayload {
  event_type: 'donation_created' | 'donation_reserved' | 'volunteer_assigned' | 'pickup_status_changed' | 'donation_delivered';
  donation_id?: string;
  user_id?: string;
  message: string;
  notify_role?: string; // e.g. 'ngo' to notify all NGOs
}

export async function sendNotification(payload: NotificationPayload) {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload,
    });
    if (error) {
      console.error('Notification error:', error);
    }
    return data;
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}
