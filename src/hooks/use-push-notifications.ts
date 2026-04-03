import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

const VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-qy-L_9BwzPGReaj5_v-fSaJNK7lOmGp2WnXRs';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function usePushNotifications() {
  const { user } = useAuth();

  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!isSupported || !user) return;

    let mounted = true;

    const initPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
        const sub = await reg.pushManager.getSubscription();

        if (mounted) {
          setIsSubscribed(!!sub);
        }
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    initPush();

    return () => {
      mounted = false;
    };
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) return false;

    try {
      setLoading(true);

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });

      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = sub.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        console.error('Invalid push subscription payload:', subJson);
        setLoading(false);
        return false;
      }

      const payload: PushSubscriptionRow = {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'user_id,endpoint' });

      if (error) {
        console.error('Failed to store push subscription:', error);
        setLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      setLoading(false);
      return false;
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return false;

    try {
      setLoading(true);

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        const unsubscribed = await sub.unsubscribe();

        if (!unsubscribed) {
          console.warn('Push unsubscribe returned false');
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);

        if (error) {
          console.error('Failed to delete push subscription:', error);
          setLoading(false);
          return false;
        }
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      setLoading(false);
      return false;
    }
  }, [isSupported, user]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}