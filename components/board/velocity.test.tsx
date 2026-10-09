import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BurnChart, VelocityChart } from './velocity';

const sprint = (number: number, completed: number) => ({ number, starts_at: '', closed_at: '', completed });

test('velocity waits for three closed sprints', () => {
  const html = renderToStaticMarkup(<VelocityChart velocity={{ unit: 'points', sprints: [sprint(1, 5)], current: null }} />);
  expect(html).toContain('after 3 closed sprints');
  expect(html).toContain('1 closed so far');
  expect(html).not.toContain('data-slot="chart"');
});

test('velocity bars and the average', () => {
  const html = renderToStaticMarkup(<VelocityChart velocity={{ unit: 'points', sprints: [sprint(1, 3), sprint(2, 6), sprint(3, 9)], current: null }} />);
  expect(html).toContain('6 points'); // recharts draws client-side; the summary and container render here
  expect(html).toContain('data-slot="chart"');
  expect(html).not.toContain('closed so far');
});

test('burn chart summary', () => {
  const burn = { number: 4, starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-15T00:00:00Z', total: 13, unestimated: 2, done: [{ at: '2026-10-02T00:00:00Z', value: 5 }] };
  const html = renderToStaticMarkup(<BurnChart burn={burn} unit="points" now={Date.parse('2026-10-05T00:00:00Z')} />);
  expect(html).toContain('5 of 13 points done in sprint 4');
  expect(html).toContain('2 tickets have no estimate');
  expect(html).toContain('burn-down');
});
