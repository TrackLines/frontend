// pageItems lists the page buttons to show: first, last and the current page's neighbours, with
// 'gap' for skipped runs (a single skipped page is shown instead of a gap).
export function pageItems(current: number, last: number): (number | 'gap')[] {
  const keep = [...new Set([1, current - 1, current, current + 1, last])].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  let prev = 0;
  for (const p of keep) {
    if (p - prev === 2) out.push(p - 1);
    else if (p - prev > 2) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}
