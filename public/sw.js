// Tracklines service worker: shows Web Push notifications (sent by the backend's notifications.Push)
// even when no Tracklines tab is open, and opens the ticket or board when one is clicked.
self.addEventListener('push', (event) => {
  let msg = { title: 'TrackLin.es', body: 'You have a new notification', url: '/', tag: 'tracklines' };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    // keep the default message
  }
  event.waitUntil(self.registration.showNotification(msg.title, {
    body: msg.body, tag: msg.tag, icon: '/icon.png', badge: '/icon.png', data: { url: msg.url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // only paths on this site (the backend sends /tickets/… or /boards/…)
  const path = typeof event.notification.data?.url === 'string' && event.notification.data.url.startsWith('/') && !event.notification.data.url.startsWith('//')
    ? event.notification.data.url : '/';
  const target = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
    if (tab) {
      await tab.focus();
      return tab.navigate(target);
    }
    return self.clients.openWindow(target);
  })());
});
