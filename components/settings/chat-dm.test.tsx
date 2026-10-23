import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
import { ApiError } from '@/lib/api';
import { i18nFor } from '@/lib/i18n';
import { ChatDmView, ChatLinkView, linkError } from './chat-dm';

const i18n = i18nFor('en');

const card = (link: Parameters<typeof ChatDmView>[0]['link']) => renderToStaticMarkup(<ChatDmView link={link} busy={false} error="" onUnlink={() => {}} />);

test('Google Chat card (TL-289): hidden without the app; says how to link; linked people can unlink', () => {
  expect(card(null)).toBe('');
  expect(card({ available: false, linked: false })).toBe('');
  const unlinked = card({ available: true, linked: false });
  expect(unlinked).toContain('Not linked');
  expect(unlinked).toContain('find “TrackLin.es” in Google Chat');
  expect(unlinked).not.toContain('>Unlink<');
  const linked = card({ available: true, linked: true });
  expect(linked).toContain('>Linked<');
  expect(linked).toContain('>Unlink<');
});

test('the link page says what happened, and what to do when the link is spent', () => {
  expect(renderToStaticMarkup(<ChatLinkView result="linking" />)).toContain('Linking your Google Chat…');
  expect(renderToStaticMarkup(<ChatLinkView result="linked" />)).toContain('You’re linked');
  expect(linkError(i18n, new ApiError(400, 'x'))).toContain('Send the TrackLin.es app a message');
  expect(linkError(i18n, new ApiError(503, 'x'))).toContain('isn’t set up');
  expect(linkError(i18n, new Error('network'))).toBe('Couldn’t link Google Chat. Please try again.');
  expect(renderToStaticMarkup(<ChatLinkView result={{ error: 'expired' }} />)).toContain('role="alert"');
});

test('the link page asks which Google account before linking, and never links on load (audit)', async () => {
  const ask = renderToStaticMarkup(<ChatLinkView result={{ confirm: 'ava@acme.test' }} />);
  expect(ask).toContain('<strong>ava@acme.test</strong>');
  expect(ask).toContain('If someone sent it to you, don’t.');
  expect(ask).toContain('>Link this account<');
  expect(ask).not.toContain('role="alert"');
  const page = await Bun.file(new URL('../../app/chat/link/page.tsx', import.meta.url)).text();
  const effect = page.slice(page.indexOf('useEffect('), page.indexOf('const confirm'));
  expect(effect).toContain('chatApp.linkCode(');
  expect(effect).not.toContain('chatApp.link(');
});

test('the link page needs sign-in, so the code links the right account', async () => {
  const src = await Bun.file(new URL('../../proxy.ts', import.meta.url)).text();
  expect(src).toContain("'/chat'");
});
