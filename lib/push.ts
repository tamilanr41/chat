import api from './api';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPush() {
  console.log('[Push] Starting...');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[Push] Service worker or PushManager not supported');
    return;
  }
  if (!VAPID_PUBLIC_KEY) {
    console.log('[Push] VAPID key missing!');
    return;
  }
  console.log('[Push] VAPID key found');

  const permission = await Notification.requestPermission();
  console.log('[Push] Permission:', permission);
  if (permission !== 'granted') return;

  const reg = await navigator.serviceWorker.register('/sw.js');
  console.log('[Push] SW registered');
  await navigator.serviceWorker.ready;
  console.log('[Push] SW ready');

  const existingSub = await reg.pushManager.getSubscription();
  if (existingSub) {
    console.log('[Push] Existing subscription found, sending to backend');
    await sendSubscriptionToBackend(existingSub);
    return;
  }

  console.log('[Push] Creating new subscription...');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  console.log('[Push] Subscription created');

  await sendSubscriptionToBackend(sub);
}

async function sendSubscriptionToBackend(sub: PushSubscription) {
  try {
    console.log('[Push] Sending subscription to backend...');
    const res = await api.post('/push/subscribe', { subscription: sub.toJSON() });
    console.log('[Push] Subscription sent!', res.data);
  } catch (e: any) {
    console.error('[Push] Failed to send subscription:', e?.message, e?.response?.data);
  }
}

export async function unregisterPush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    try { await api.post('/push/unsubscribe', { endpoint: sub.endpoint }); } catch {}
  }
}
