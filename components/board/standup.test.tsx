import { expect, test } from 'bun:test';
import { render as renderToStaticMarkup } from '@/test/i18n';
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
  expect(html).toContain('aria-label="Start"');
  expect(html).toContain('waiting to start');
  expect(html).toContain('2:00'); // the full turn, not counting down
  expect(html).not.toContain('aria-label="Resume"');
  // once it's begun, pausing shows Resume as before
  const paused = renderToStaticMarkup(<StandupPanel standup={{ ...fresh, spentMs: 5000 }} onAction={() => {}} />);
  expect(paused).toContain('aria-label="Resume"');
  expect(paused).toContain('· paused');
});

test('only the host runs the standup: followers see the turn and clock, without the controls (TL-235)', () => {
  const s = { people: [{ id: 'a', label: 'Ava' }, { id: 'b', label: 'Bo' }], index: 0, spentMs: 0, runningSince: null };
  const follower = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} canRun={false} />);
  expect(follower).toContain('Ava’s turn');
  expect(follower).toContain('2:00');
  for (const control of ['aria-label="Start"', 'Previous', 'Next', '>End<']) expect(follower).not.toContain(control);
  expect(follower).toContain('tabindex="-1"'); // the running order is shown, not clickable
  const host = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} />);
  for (const control of ['aria-label="Start"', 'Previous', 'Next', '>End<']) expect(host).toContain(control);
});

test('each viewer names people from their own list: "You" is only ever the viewer (TL-236)', () => {
  // the starter (Max) saved himself as "You"; Other is watching
  const s = { people: [{ id: 'user_other', label: 'other@develbox.info' }, { id: 'user_max', label: 'You' }], index: 1, spentMs: 0, runningSince: null };
  const othersList = [{ id: 'user_other', label: 'You', kind: 'person' as const }, { id: 'user_max', label: 'Max Hooton', kind: 'person' as const }];
  const html = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} people={othersList} />);
  expect(html).toContain('Max Hooton’s turn');
  expect(html).toContain('>You<'); // Other, in the running order
  expect(html).not.toContain('You’s turn');
  // on Other's own turn: "Your turn"
  expect(renderToStaticMarkup(<StandupPanel standup={{ ...s, index: 0 }} onAction={() => {}} people={othersList} />)).toContain('Your turn');
  // while the list loads, nobody else is called "You"
  expect(renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} />)).toContain('A teammate’s turn');
});

test('the running order is a list down the side, the speaker highlighted, the review last (TL-237)', () => {
  const s = { people: [{ id: 'a', label: 'Ava' }, { id: 'b', label: 'Bo' }], index: 1, spentMs: 0, runningSince: 1 };
  const html = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} />);
  expect(html).toContain('<aside aria-label="Standup"');
  expect(html).toMatch(/aria-current="step"[^>]*>Bo</);
  expect(html).toMatch(/line-through[^>]*>Ava</); // done
  expect(html.indexOf('>Bo<')).toBeLessThan(html.indexOf('>Board Review<'));
  expect(html).toContain('aria-label="Pause"'); // running
});

test('the host can drag each person’s face onto a ticket; faces keep the running order; followers can’t drag (TL-266)', () => {
  const s = start([{ id: 'user_ava', label: 'Ava' }, { id: 'user_bo', label: 'Bo' }, { id: 'user_cy', label: 'Cy' }], 0);
  const people = [{ id: 'user_ava', label: 'Ava Smith' }, { id: 'user_bo', label: 'Bo Jones' }, { id: 'user_cy', label: 'Cy Ng' }];
  const host = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} canRun people={people} />);
  const drags = [...host.matchAll(/aria-label="Drag ([^"]+) onto a ticket to assign them"/g)].map((m) => m[1]);
  expect(drags).toEqual(['Ava Smith', 'Bo Jones', 'Cy Ng']); // one per person, in the running order
  expect(host).toContain('>AS<'); // initials when there's no picture
  const follower = renderToStaticMarkup(<StandupPanel standup={s} onAction={() => {}} canRun={false} people={people} />);
  expect(follower).not.toContain('onto a ticket to assign');
  expect(follower).toContain('>BJ<'); // faces still shown
});
