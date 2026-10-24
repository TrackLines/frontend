import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { NOTIFICATION_ICONS, NotificationIcon } from './notification-icon';

test('every notification type has its own icon and label; ones that ask for something are amber (TL-280)', () => {
  const kinds = Object.keys(NOTIFICATION_ICONS);
  expect(new Set(kinds.map((k) => NOTIFICATION_ICONS[k as keyof typeof NOTIFICATION_ICONS].icon)).size).toBe(kinds.length);
  expect(renderToStaticMarkup(<NotificationIcon kind="over_capacity" />)).toContain('text-amber-600');
  expect(renderToStaticMarkup(<NotificationIcon kind="approval" />)).toContain('text-amber-600');
  const mention = renderToStaticMarkup(<NotificationIcon kind="mention" />);
  expect(mention).toContain('title="Mentioned you"');
  expect(mention).not.toContain('amber');
});

test('a type the app doesn\'t know yet still gets an icon', () => {
  const html = renderToStaticMarkup(<NotificationIcon kind="something_new" />);
  expect(html).toContain('<svg');
  expect(html).not.toContain('title=');
});
