'use client';

import type { I18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, boardTemplates, type BoardTemplate } from '@/lib/api';
import { SCALES } from '@/lib/estimates';

export const DEFAULT_TEMPLATE = 'builtin:simple';

// templateSummary is a template's columns in order, with WIP limits.
export function templateSummary(tpl: BoardTemplate, i18n: I18n): string {
  return tpl.columns.map(({ name, wip_limit: wip }) => (wip ? i18n._(msg`${name} (WIP ${wip})`) : name)).join(' → ');
}

// TemplatePicker chooses the template a new board starts from, and shows what it sets up.
export function TemplatePicker({ value, onChange, token }: { value: string; onChange: (id: string) => void; token: string }) {
  const { t, i18n } = useLingui();
  const [list, setList] = useState<BoardTemplate[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    boardTemplates.list(token).then(setList, () => setError(t`Couldn’t load templates; the board will use the Simple layout.`));
  }, []); // load once; token refreshes must not refetch

  const chosen = list?.find((tpl) => tpl.id === value);
  const own = list?.filter((tpl) => !tpl.builtin) ?? [];
  const scale = chosen && SCALES.find((s) => s.value === chosen.estimate_scale);

  async function remove(tpl: BoardTemplate) {
    setError('');
    try {
      await boardTemplates.remove(tpl.id, token);
      setList((l) => l?.filter((x) => x.id !== tpl.id) ?? l);
      onChange(DEFAULT_TEMPLATE);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 403 ? t`Only organization admins can delete templates.` : t`Couldn’t delete the template. Please try again.`);
    }
  }

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium"><Trans>Template</Trans></span>
      <Select items={Object.fromEntries((list ?? []).map((tpl) => [tpl.id, tpl.name]))} value={value} disabled={!list} onValueChange={(v) => v && onChange(String(v))}>
        <SelectTrigger className="w-full" aria-label={t`Board template`}><SelectValue placeholder={t`Simple`} /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel><Trans>Built-in</Trans></SelectLabel>
            {list?.filter((tpl) => tpl.builtin).map((tpl) => <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>)}
          </SelectGroup>
          {own.length > 0 && (
            <SelectGroup>
              <SelectLabel><Trans>Your organization</Trans></SelectLabel>
              {own.map((tpl) => <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>)}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {chosen && (
        <div className="grid gap-1.5 rounded-lg border p-3">
          <p className="text-muted-foreground">{templateSummary(chosen, i18n)}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{chosen.style === 'kanban' ? t`Kanban` : t`Sprints`}</Badge>
            <Badge variant="secondary">{scale ? i18n._(scale.label) : chosen.estimate_scale}</Badge>
            {!chosen.builtin && <Button type="button" size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => remove(chosen)}><Trans>Delete template</Trans></Button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
