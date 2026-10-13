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
