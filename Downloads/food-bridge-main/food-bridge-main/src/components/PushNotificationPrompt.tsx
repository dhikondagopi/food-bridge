import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { toast } from 'sonner';

const PushNotificationPrompt = () => {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.info('Push notifications disabled');
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('Push notifications enabled! You\'ll get alerts even when the app is in the background.');
      } else if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
      }
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      title={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
      className="relative"
    >
      {isSubscribed ? (
        <Bell className="h-4 w-4 text-primary" />
      ) : (
        <BellOff className="h-4 w-4 text-muted-foreground" />
      )}
      {isSubscribed && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
      )}
    </Button>
  );
};

export default PushNotificationPrompt;
