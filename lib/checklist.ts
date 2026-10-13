// Markdown task lists ("- [ ] thing", "- [x] done") in ticket details: count them, and tick or untick
// one by its source line (react-markdown reports each checkbox's line). Code blocks don't count.

const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s)/;

function taskLines(md: string): Map<number, boolean> {
  const out = new Map<number, boolean>(); // 1-based line → done
  let fenced = false;
  md.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const m = !fenced && TASK.exec(line);
    if (m) out.set(i + 1, m[2] !== ' ');
  });
  return out;
}

// checklistCount: how many tasks are done out of how many; total 0 = no checklist.
export function checklistCount(md: string): { done: number; total: number } {
  const tasks = [...taskLines(md).values()];
  return { done: tasks.filter(Boolean).length, total: tasks.length };
}

// toggleTask: md with the task on (1-based) line ticked or unticked; unchanged if that line isn't a task.
export function toggleTask(md: string, line: number): string {
  const done = taskLines(md).get(line);
  if (done === undefined) return md;
  const lines = md.split('\n');
  lines[line - 1] = lines[line - 1].replace(TASK, (_, a, _mark, b) => `${a}${done ? ' ' : 'x'}${b}`);
  return lines.join('\n');
}
