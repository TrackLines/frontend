import { expect, test } from 'bun:test';
import { createRequire } from 'module';

// The widget is a classic script served from public/; load its exported render helpers as CommonJS.
const require = createRequire(import.meta.url);
const widget = require('../public/embed.js') as {
  esc: (s: unknown) => string;
  apiBaseFrom: (src: string) => string;
  withKey: (url: string, key: string) => string;
  renderRoadmap: (data: unknown) => string;
  renderForm: () => string;
  submitError: (status: number) => string;
};

test('withKey adds the embed key as a query param, only when there is one', () => {
  expect(widget.withKey('https://t.es/api/roadmaps/1', 'tle_k')).toBe('https://t.es/api/roadmaps/1?embed=tle_k');
  expect(widget.withKey('https://t.es/api/roadmaps/1?x=1', 'tle_k')).toBe('https://t.es/api/roadmaps/1?x=1&embed=tle_k');
  expect(widget.withKey('https://t.es/api/roadmaps/1', '')).toBe('https://t.es/api/roadmaps/1');
});

test('apiBaseFrom points the widget at the site it was served from', () => {
  expect(widget.apiBaseFrom('https://tracklin.es/embed.js')).toBe('https://tracklin.es/api');
  expect(widget.apiBaseFrom('https://tracklin.es/embed.js?v=2')).toBe('https://tracklin.es/api');
  expect(widget.apiBaseFrom('http://localhost:3000/embed.js')).toBe('http://localhost:3000/api');
  expect(widget.apiBaseFrom('not a url')).toBe('/api'); // graceful fallback
});

test('esc neutralises HTML so remote data cannot inject into the host page', () => {
  expect(widget.esc('<img src=x onerror=alert(1)>')).not.toContain('<img');
  expect(widget.esc('a & b')).toBe('a &amp; b');
  expect(widget.esc(null)).toBe('');
});

test('renderRoadmap shows items, status and progress, and escapes titles (TL-494)', () => {
  const html = widget.renderRoadmap({
    title: 'Launch <plan>',
    description: 'What is coming',
    items: [
      { title: 'Auth', status: 'done', target_date: '2026-12-01', progress: { done: 3, total: 3 } },
      { title: 'Billing', manual_status: 'in_progress', progress: { done: 1, total: 4 } },
    ],
  });
  expect(html).toContain('Launch &lt;plan&gt;'); // escaped, no raw tag
  expect(html).not.toContain('<plan>');
  expect(html).toContain('What is coming');
  expect(html).toContain('Auth');
  expect(html).toContain('Done');
  expect(html).toContain('3/3 done');
  expect(html).toContain('2026-12-01');
  expect(html).toContain('Billing');
  expect(html).toContain('In progress');
  expect(html).toContain('tl-embed-in_progress');
});

test('renderRoadmap handles an empty roadmap', () => {
  const html = widget.renderRoadmap({ title: 'Soon', items: [] });
  expect(html).toContain('Soon');
  expect(html).toContain('Nothing on the roadmap yet');
});

test('renderForm has the type choice, title, honeypot and submit', () => {
  const html = widget.renderForm();
  expect(html).toContain('value="bug"');
  expect(html).toContain('value="feature"');
  expect(html).toContain('name="title"');
  expect(html).toContain('name="website"'); // honeypot
  expect(html).toContain('tl-embed-hp'); // honeypot is visually hidden
  expect(html).toContain('type="submit"');
});

test('submitError speaks to the visitor by status', () => {
  expect(widget.submitError(400)).toContain('title');
  expect(widget.submitError(404)).toContain('isn’t taking requests');
  expect(widget.submitError(429)).toContain('try again');
  expect(widget.submitError(500)).toContain('try again');
});
