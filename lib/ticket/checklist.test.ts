import { expect, test } from 'bun:test';
import { checklistCount, toggleTask } from './checklist';

const md = ['Before launch:', '', '- [x] Migrations', '- [ ] Backups', '  * [X] nested, done', '1. [ ] numbered', '', '```', '- [ ] not a task (code)', '```', '- not a task', '- [] not a task either'].join('\n');

test('counts done tasks out of all tasks, ignoring code blocks and lookalikes', () => {
  expect(checklistCount(md)).toEqual({ done: 2, total: 4 });
  expect(checklistCount('no checklist here')).toEqual({ done: 0, total: 0 });
});

test('ticks and unticks one task by its line, leaving everything else as written', () => {
  const ticked = toggleTask(md, 4);
  expect(ticked.split('\n')[3]).toBe('- [x] Backups');
  expect(checklistCount(ticked)).toEqual({ done: 3, total: 4 });
  expect(toggleTask(md, 3).split('\n')[2]).toBe('- [ ] Migrations');
  expect(toggleTask(md, 5).split('\n')[4]).toBe('  * [ ] nested, done');
  expect(toggleTask(toggleTask(md, 6), 6)).toBe(md);
  expect(toggleTask(md, 9)).toBe(md); // inside a code block
  expect(toggleTask(md, 1)).toBe(md); // not a task
});
