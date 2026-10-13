import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { start } from '@/lib/standup';
import { StandupPanel } from './standup';

test('standup shows the sprint goal everyone is working towards', () => {
  const s = start([{ id: 'a', label: 'Ava' }], 0);
  expect(renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} goal="Ship search" />)).toContain('Ship search');
  expect(renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} />)).not.toContain('Sprint goal');
});

test('the last step is the Board Review (it changes nothing)', () => {
  const html = renderToStaticMarkup(<StandupPanel standup={start([{ id: 'a', label: 'Ava' }], 0)} onAction={() => {}} />);
  expect(html).toContain('Board Review');
  expect(html).not.toContain('Clean board');
});

test('a new standup waits for the host: Start, not a running clock (TL-231)', () => {
  const fresh = { people: [{ id: 'a', label: 'Ava' }], index: 0, spentMs: 0, runningSince: null };
  const html = renderToStaticMarkup(<StandupPanel standup={fresh} onAction={() => {}} />);
  expect(html).toContain('>Start<');
  expect(html).toContain('(waiting to start)');
  expect(html).toContain('2:00'); // the full turn, not counting down
  expect(html).not.toContain('>Resume<');
  // once it's begun, pausing shows Resume as before
  const paused = renderToStaticMarkup(<StandupPanel standup={{ ...fresh, spentMs: 5000 }} onAction={() => {}} />);
  expect(paused).toContain('>Resume<');
  expect(paused).toContain('(paused)');
});

test('only the host runs the standup: followers see the turn and clock, without the controls (TL-235)', () => {
  const s = { people: [{ id: 'a', label: 'Ava' }, { id: 'b', label: 'Bo' }], index: 0, spentMs: 0, runningSince: null };
  const follower = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} canRun={false} />);
  expect(follower).toContain('Ava’s turn');
  expect(follower).toContain('2:00');
  for (const control of ['>Start<', '>Previous<', '>Next<', '>End<']) expect(follower).not.toContain(control);
  expect(follower).toContain('tabindex="-1"'); // the running order is shown, not clickable
  const host = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} />);
  for (const control of ['>Start<', '>Previous<', '>Next<', '>End<']) expect(host).toContain(control);
});
