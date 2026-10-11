import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { start } from '@/lib/standup';
import { StandupPanel } from './standup';

test('standup shows the sprint goal everyone is working towards', () => {
  const s = start([{ id: 'a', label: 'Ava' }], 0);
  expect(renderToStaticMarkup(<StandupPanel standup={s} onChange={() => {}} onEnd={() => {}} goal="Ship search" />)).toContain('Ship search');
  expect(renderToStaticMarkup(<StandupPanel standup={s} onChange={() => {}} onEnd={() => {}} />)).not.toContain('Sprint goal');
});
