import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectCard } from './project-card';

const project = { id: 'p1', name: 'Web', description: '', created_at: '', updated_at: '' };

test('card shows sizes, urgent count and progress', () => {
  const html = renderToStaticMarkup(<ProjectCard project={{ ...project, stats: { boards: 1, roadmaps: 0, open: 3, done: 1, backlog: 5, urgent: 2, active: new Date().toISOString() } }} />);
  expect(html).toContain('2 urgent');
  expect(html).toContain('1 board<');
  expect(html).toContain('5 in backlog');
  expect(html).toContain('1 of 4 done');
  expect(html).toContain('width:25%');
  expect(html).not.toContain('roadmap');
});

test('empty project: no urgent badge or progress bar', () => {
  const html = renderToStaticMarkup(<ProjectCard project={{ ...project, stats: { boards: 0, roadmaps: 0, open: 0, done: 0, backlog: 0, urgent: 0, active: new Date().toISOString() } }} />);
  expect(html).not.toContain('urgent');
  expect(html).not.toContain('progressbar');
  expect(html).toContain('No boards yet.');
  expect(html).toContain('Active just now');
});
