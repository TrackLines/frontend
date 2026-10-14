'use client';

import { BellIcon, XIcon } from 'lucide-react';
import { NotificationIcon } from '@/components/notification-icon';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { When } from '@/components/when';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { notifications, tickets, type AppNotification, type Assignee } from '@/lib/api';
import { newSince, newest, notificationHref, notificationLine } from '@/lib/notifications';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useToken } from '@/lib/use-token';
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push';

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

// NotificationsBell: the header bell with the unread count (polled), an inbox dropdown, and desktop
// popups for new ones while a Tracklines tab is open (Web Push with the tab closed comes later).
export function NotificationsBell() {
  const token = useToken();
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [people, setPeople] = useState<Assignee[]>([]);
  const [failed, setFailed] = useState(false);
  const [showRead, setShowRead] = useState(false); // read ones are hidden unless asked for
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [pushOn, setPushOn] = useState<PushState>('unsupported'); // Web Push on this device (works with the tab closed)
  const [pushBusy, setPushBusy] = useState(false);
  const since = useRef<string | null>(null); // desktop popups have shown everything up to here
  const lastCount = useRef(0);

  useEffect(() => {
    if (canNotify()) setPermission(Notification.permission);
    since.current = new Date().toISOString().replace(/\.\d+Z$/, 'Z'); // only pop up what arrives from now on
  }, []);

  async function poll() {
    if (!token) return;
    const { count: n } = await notifications.unreadCount(token);
    setCount(n);
    // with Web Push on, the service worker shows them; in-tab popups would double up
    if (n > lastCount.current && pushOn !== 'on' && canNotify() && Notification.permission === 'granted') {
      const list = await notifications.list(token);
      const fresh = newSince(list, since.current).slice(-3); // a burst shows its latest three
      if (fresh.length) {
        const names = people.length ? people : await tickets.assignees(token).catch(() => []);
        for (const x of fresh) {
          const popup = new Notification('Tracklines', { body: notificationLine(x, names), tag: x.id });
          popup.onclick = () => { window.focus(); void open(x); };
        }
      }
      since.current = newest(list, since.current);
    }
    lastCount.current = n;
  }
  useEffect(() => { void poll().catch(() => {}); }, [token !== null]);
  useEffect(() => { if (token) void pushState(token).then(setPushOn, () => {}); }, [token !== null]);

  async function togglePush() {
    if (!token) return;
    setPushBusy(true);
    try {
      setPushOn(await (pushOn === 'on' ? disablePush(token) : enablePush(token)));
    } catch {
      setPushOn(await pushState(token).catch(() => 'off' as PushState));
    } finally {
      setPushBusy(false);
      if (canNotify()) setPermission(Notification.permission);
    }
  }
  useAutoRefresh(() => poll().catch(() => {}), token !== null);

  async function load() {
    if (!token) return;
    setFailed(false);
    try {
      const [list, names] = await Promise.all([notifications.list(token), people.length ? people : tickets.assignees(token).catch(() => [])]);
      setItems(list);
      setPeople(names);
    } catch {
      setFailed(true);
    }
  }

  async function open(n: AppNotification) {
    if (!token) return;
    if (!n.read_at) {
      await notifications.read(n.id, token).catch(() => {});
      setCount((c) => Math.max(0, c - 1));
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? list);
    }
    const href = notificationHref(n);
    if (href) router.push(href);
  }

  async function dismiss(n: AppNotification) {
    if (!token) return;
    await notifications.dismiss(n.id, token).catch(() => {});
    if (!n.read_at) setCount((c) => Math.max(0, c - 1));
    setItems((list) => list?.filter((x) => x.id !== n.id) ?? list);
  }

  async function clearRead() {
    if (!token) return;
    await notifications.clearRead(token).catch(() => {});
    setItems((list) => list?.filter((x) => !x.read_at) ?? list);
    setShowRead(false);
  }

  async function readAll() {
    if (!token) return;
    await notifications.readAll(token).catch(() => {});
    setCount(0);
    lastCount.current = 0;
    setItems((list) => list?.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })) ?? list);
  }

  async function enableDesktop() {
    if (!canNotify()) return;
    setPermission(await Notification.requestPermission());
  }

  if (!token) return null;
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) { setShowRead(false); void load(); } }}>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="relative" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} />}>
        <BellIcon aria-hidden />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-medium text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <NotificationsList items={items} people={people} failed={failed} unread={count} showRead={showRead}
          onOpen={(n) => void open(n)} onDismiss={(n) => void dismiss(n)} onReadAll={() => void readAll()}
          onShowRead={setShowRead} onClearRead={() => void clearRead()} />
        {(pushOn === 'on' || pushOn === 'off' || pushOn === 'blocked') ? (
          <PushControl state={pushOn} busy={pushBusy} onToggle={() => void togglePush()} />
        ) : permission === 'default' && (
          <div className="border-t px-3 py-2 text-xs">
            <button type="button" className="font-medium hover:underline" onClick={() => void enableDesktop()}>Turn on desktop notifications</button>
            <span className="text-muted-foreground"> while Tracklines is open</span>
          </div>
        )}
        {pushOn !== 'blocked' && permission === 'denied' && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Desktop notifications are blocked for this site in your browser settings.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// NotificationsList: the inbox (pure, for tests): unread marked, newest-first within read/unread.
// Read ones are hidden unless showRead: opening or dismissing one takes it out of the bell.
export function NotificationsList({ items, people, failed, unread, showRead = false, onOpen, onDismiss, onReadAll, onShowRead, onClearRead }: {
  items: AppNotification[] | null; people: Assignee[]; failed: boolean; unread: number; showRead?: boolean;
  onOpen: (n: AppNotification) => void; onDismiss?: (n: AppNotification) => void; onReadAll: () => void;
  onShowRead?: (show: boolean) => void; onClearRead?: () => void;
}) {
  const shown = items?.filter((n) => showRead || !n.read_at) ?? null;
  const readCount = items?.filter((n) => n.read_at).length ?? 0;
  return (
    <div className="grid">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Notifications</span>
        {unread > 0 && <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline" onClick={onReadAll}>Mark all read</button>}
      </div>
      {failed ? <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">Couldn&apos;t load notifications.</p>
        : shown === null ? <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        : shown.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {shown.map((n) => (
              <li key={n.id} className="group flex items-start hover:bg-muted">
                <button type="button" onClick={() => onOpen(n)} className={`flex min-w-0 flex-1 gap-2 py-2.5 pl-3 text-left text-sm ${n.read_at ? 'text-muted-foreground' : ''}`}>
                  <span aria-label={n.read_at ? undefined : 'Unread'} className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? '' : 'bg-primary'}`} />
                  <NotificationIcon kind={n.kind} />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="break-words">{notificationLine(n, people)}</span>
                    <span className="text-xs text-muted-foreground"><When iso={n.created_at} /></span>
                  </span>
                </button>
                {onDismiss && (
                  <button type="button" aria-label={`Clear: ${notificationLine(n, people)}`} title="Clear"
                    className="m-1.5 rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => onDismiss(n)}>
                    <XIcon className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      {onShowRead && readCount > 0 && (
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <button type="button" className="font-medium hover:text-foreground hover:underline" onClick={() => onShowRead(!showRead)}>
            {showRead ? 'Hide read' : `Show read (${readCount})`}
          </button>
          {showRead && onClearRead && <button type="button" className="font-medium hover:text-foreground hover:underline" onClick={onClearRead}>Clear read</button>}
        </div>
      )}
    </div>
  );
}

// PushControl: "Notify me on this device" (Web Push: arrives even with Tracklines closed). Pure, for tests.
export function PushControl({ state, busy, onToggle }: { state: PushState; busy: boolean; onToggle: () => void }) {
  if (state === 'blocked') {
    return <p className="border-t px-3 py-2 text-xs text-muted-foreground">Notifications are blocked for this site in your browser settings.</p>;
  }
  if (state !== 'on' && state !== 'off') return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
      <span>
        <span className="font-medium">Notify me on this device</span>
        <span className="block text-muted-foreground">{state === 'on' ? 'On, even when Tracklines is closed' : 'Get notifications even when Tracklines is closed'}</span>
      </span>
      <Button type="button" size="sm" variant={state === 'on' ? 'outline' : 'default'} disabled={busy} aria-pressed={state === 'on'} onClick={onToggle}>
        {busy ? '…' : state === 'on' ? 'Turn off' : 'Turn on'}
      </Button>
    </div>
  );
}
