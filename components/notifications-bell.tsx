'use client';

import { BellIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { When } from '@/components/when';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { notifications, tickets, type AppNotification, type Assignee } from '@/lib/api';
import { newSince, newest, notificationHref, notificationLine } from '@/lib/notifications';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useToken } from '@/lib/use-token';

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
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
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
    if (n > lastCount.current && canNotify() && Notification.permission === 'granted') {
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
    <DropdownMenu onOpenChange={(o) => { if (o) void load(); }}>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="relative" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} />}>
        <BellIcon aria-hidden />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-medium text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <NotificationsList items={items} people={people} failed={failed} unread={count} onOpen={(n) => void open(n)} onReadAll={() => void readAll()} />
        {permission === 'default' && (
          <div className="border-t px-3 py-2 text-xs">
            <button type="button" className="font-medium hover:underline" onClick={() => void enableDesktop()}>Turn on desktop notifications</button>
            <span className="text-muted-foreground"> while Tracklines is open</span>
          </div>
        )}
        {permission === 'denied' && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Desktop notifications are blocked for this site in your browser settings.</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// NotificationsList: the inbox (pure, for tests): unread marked, newest-first within read/unread.
export function NotificationsList({ items, people, failed, unread, onOpen, onReadAll }: {
  items: AppNotification[] | null; people: Assignee[]; failed: boolean; unread: number;
  onOpen: (n: AppNotification) => void; onReadAll: () => void;
}) {
  return (
    <div className="grid">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Notifications</span>
        {unread > 0 && <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline" onClick={onReadAll}>Mark all read</button>}
      </div>
      {failed ? <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">Couldn&apos;t load notifications.</p>
        : items === null ? <p role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
        : items.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => onOpen(n)} className={`flex w-full gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted ${n.read_at ? 'text-muted-foreground' : ''}`}>
                  <span aria-label={n.read_at ? undefined : 'Unread'} className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? '' : 'bg-primary'}`} />
                  <span className="grid min-w-0 gap-0.5">
                    <span className="break-words">{notificationLine(n, people)}</span>
                    <span className="text-xs text-muted-foreground"><When iso={n.created_at} /></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
