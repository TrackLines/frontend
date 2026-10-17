import { push } from './api';
import { reportClient } from './report';

export type PushState = 'unsupported' | 'unavailable' | 'blocked' | 'off' | 'on';

// pushSupported: the browser can do Web Push (on iPhone/iPad only once Tracklines is added to the Home Screen).
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// keyBytes turns the server's VAPID public key (base64url) into what PushManager.subscribe wants.
export function keyBytes(base64url: string): Uint8Array {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js');
}

// pushState: whether this device gets pushes (and why not).
export async function pushState(token: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const settings = await push.settings(token).catch(() => ({ enabled: false }));
  if (!settings.enabled) return 'unavailable';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ? 'on' : 'off';
}

// enablePush asks permission, subscribes this browser with the server's key, and saves it.
export async function enablePush(token: string): Promise<PushState> {
  const settings = await push.settings(token);
  if (!settings.enabled || !settings.public_key) return 'unavailable';
  if ((await Notification.requestPermission()) !== 'granted') return 'blocked';
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(settings.public_key) as BufferSource });
  await push.subscribe(sub.toJSON(), token);
  return 'on';
}

// pushFailure: why turning notifications on or off failed, in words someone can act on, reported to
// Bugfixes so it isn't silent (TL-393). Chromium builds without Google's push service (e.g. plain
// Chromium on Linux) refuse to subscribe with an AbortError: "Registration failed - push service error".
export function pushFailure(err: unknown): string {
  const e = err instanceof Error ? err : new Error(String(err));
  reportClient('error', Object.assign(new Error(`web push: ${e.name}: ${e.message}`), { stack: e.stack }));
  if (e.name === 'AbortError' || /push service/i.test(e.message)) {
    // permission is granted by now: what's missing is the browser maker's delivery service, not the user's say-so
    return 'Notifications are allowed, but this browser has no push service to deliver them when TrackLin.es is closed (plain Chromium builds don’t include one). Chrome, Edge, Firefox and Safari do.';
  }
  if (e.name === 'NotAllowedError') return 'Notifications are blocked for this site in your browser settings.';
  return 'Couldn’t change notifications on this device. Please try again.';
}

// disablePush stops pushes to this browser (server first, so nothing is left pointing at it).
export async function disablePush(token: string): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await push.unsubscribe(sub.endpoint, token).catch(() => {});
    await sub.unsubscribe();
  }
  return 'off';
}

// forgetPush stops this browser getting the last person's pushes once they sign out: the subscription
// belongs to the browser, so on a shared computer the next person would see their notifications
// (TL-252). Local only: the server drops the row the next time a push to it fails.
export async function forgetPush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  await (await reg?.pushManager.getSubscription())?.unsubscribe();
}
