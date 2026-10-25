'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { Cell, Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { num } from '@/lib/sprint-report';

export type Slice = { key: string; label: string; value: number };

const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

// slices: the ones with something in them; none when every value is zero (TL-619).
export const slices = (all: Slice[]) => all.filter((s) => s.value > 0);

// Donut: a share chart for reports (TL-619), with its numbers written out beside it, so it reads in a
// black-and-white PDF and to screen readers, not by colour alone. Nothing at all when it's empty.
export function Donut({ title, note, data }: { title: string; note: string; data: Slice[] }) {
  const { t } = useLingui();
  const shown = slices(data);
  if (shown.length === 0) return null;
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  const config: ChartConfig = Object.fromEntries(shown.map((s, i) => [s.key, { label: s.label, color: COLORS[i % COLORS.length] }]));
  return (
    <section className="grid gap-2 break-inside-avoid" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      <div className="flex flex-wrap items-center gap-6">
        <ChartContainer config={config} className="aspect-square h-48" aria-label={`${title}: ${note}`}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
            <Pie data={shown} dataKey="value" nameKey="key" innerRadius="55%" strokeWidth={2} isAnimationActive={false}>
              {shown.map((s, i) => <Cell key={s.key} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="grid gap-1 text-sm" data-donut-legend>
          {shown.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              <span>{s.label}</span>
              <span className="tabular-nums text-muted-foreground">{t`${num(s.value)} (${Math.round((s.value / total) * 100)}%)`}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">{note}</p>
      <p className="sr-only"><Trans>Total: {num(total)}</Trans></p>
    </section>
  );
}
