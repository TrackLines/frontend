import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAT_KINDS, GoogleChatView } from './google-chat';

const view = (props: Partial<Parameters<typeof GoogleChatView>[0]>) => renderToStaticMarkup(
  <GoogleChatView space={{ connected: false, kinds: ['created', 'review'] }} canManage busy="" note={null} scope="project" onSave={() => {}} onTest={() => {}} onRemove={() => {}} {...props} />,
);

test('Google Chat: an admin pastes the webhook and picks what to post; test and remove once set up (TL-288)', () => {
  const fresh = view({});
  expect(fresh).toContain('Not set up');
  expect(fresh).toContain('Apps &amp; integrations → Webhooks');
  expect(fresh).toContain('New tickets');
  expect(fresh).not.toContain('Send test message');
  expect(CHAT_KINDS.map((k) => k.kind)).not.toContain('mention'); // personal: not for a room
  const set = view({ space: { connected: true, kinds: ['created'] } });
  expect(set).toContain('Posting to a space');
  expect(set).toContain('Send test message');
  expect(set).toContain('>Remove<');
  expect(set).toContain('Replace webhook URL');
});

test('members see whether it is set up, without the form; the org space says it covers every project', () => {
  const member = view({ canManage: false, space: { connected: true, kinds: ['created'] }, scope: 'organization' });
  expect(member).toContain('Posting to a space');
  expect(member).toContain('Every project’s events');
  expect(member).not.toContain('Webhook URL');
  expect(member).not.toContain('Send test message');
});
