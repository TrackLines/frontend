'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, boardTemplates, type BoardTemplate } from '@/lib/api';
import { SCALES } from '@/lib/estimates';

export const DEFAULT_TEMPLATE = 'builtin:simple';

// templateSummary is a template's columns in order, with WIP limits.
export function templateSummary(t: BoardTemplate): string {
  return t.columns.map((c) => (c.wip_limit ? `${c.name} (WIP ${c.wip_limit})` : c.name)).join(' → ');
}

// TemplatePicker chooses the template a new board starts from, and shows what it sets up.
export function TemplatePicker({ value, onChange, token }: { value: string; onChange: (id: string) => void; token: string }) {
  const [list, setList] = useState<BoardTemplate[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    boardTemplates.list(token).then(setList, () => setError('Couldn’t load templates; the board will use the Simple layout.'));
  }, []); // load once; token refreshes must not refetch

  const chosen = list?.find((t) => t.id === value);
  const own = list?.filter((t) => !t.builtin) ?? [];

  async function remove(t: BoardTemplate) {
    setError('');
    try {
      await boardTemplates.remove(t.id, token);
      setList((l) => l?.filter((x) => x.id !== t.id) ?? l);
      onChange(DEFAULT_TEMPLATE);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? 'Only organization admins can delete templates.' : 'Couldn’t delete the template. Please try again.');
    }
  }

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">Template</span>
      <Select items={Object.fromEntries((list ?? []).map((t) => [t.id, t.name]))} value={value} disabled={!list} onValueChange={(v) => v && onChange(String(v))}>
        <SelectTrigger className="w-full" aria-label="Board template"><SelectValue placeholder="Simple" /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Built-in</SelectLabel>
            {list?.filter((t) => t.builtin).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectGroup>
          {own.length > 0 && (
            <SelectGroup>
              <SelectLabel>Your organization</SelectLabel>
              {own.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {chosen && (
        <div className="grid gap-1.5 rounded-lg border p-3">
          <p className="text-muted-foreground">{templateSummary(chosen)}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{chosen.style === 'kanban' ? 'Kanban' : 'Sprints'}</Badge>
            <Badge variant="secondary">{SCALES.find((s) => s.value === chosen.estimate_scale)?.label ?? chosen.estimate_scale}</Badge>
            {!chosen.builtin && <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remove(chosen)}>Delete template</Button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
