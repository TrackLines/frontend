'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { ListIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { SettingsCard } from '@/components/settings/settings-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { me, type LatestTicketsSettings } from '@/lib/api';

// LatestTicketsCard: the Latest tab on the home Mentions card — how many tickets (0 hides it; past 5
// they page) and at most how many from any one project.
export function LatestTicketsCard({ token }: { token: string }) {
  const [saved, setSaved] = useState<LatestTicketsSettings | null>(null);
  useEffect(() => { void me.latestTickets(token).then(setSaved, () => setSaved({ limit: 0, per_project: 3 })); }, []); // token refreshes must not refetch
  if (!saved) return null;
  return <LatestTicketsView initial={saved} onSave={(s) => me.setLatestTickets(s, token)} />;
}

export function LatestTicketsView({ initial, onSave }: { initial: LatestTicketsSettings; onSave: (s: LatestTicketsSettings) => Promise<void> }) {
  const { t } = useLingui();
  const [limit, setLimit] = useState(String(initial.limit));
  const [perProject, setPerProject] = useState(String(initial.per_project));
  const [state, setState] = useState<'' | 'saving' | 'saved' | 'failed'>('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setState('saving');
    try {
      await onSave({ limit: Number(limit), per_project: Number(perProject) });
      setState('saved');
    } catch {
      setState('failed');
    }
  }
  return (
    <SettingsCard icon={ListIcon} title={t`Latest tickets`} description={t`The newest tickets across every project, as a tab on your home Mentions card. 0 hides it; more than 5 pages.`}>
      <form onSubmit={save} className="flex w-full flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm"><Trans>How many</Trans>
          <Input type="number" min={0} max={20} required value={limit} onChange={(e) => setLimit(e.target.value)} className="w-24" />
        </label>
        <label className="grid gap-1 text-sm"><Trans>Per project</Trans>
          <Input type="number" min={1} max={20} required value={perProject} onChange={(e) => setPerProject(e.target.value)} className="w-24" />
        </label>
        <Button type="submit" variant="outline" size="sm" disabled={state === 'saving'}><Trans>Save</Trans></Button>
      </form>
      {state === 'saved' && <p role="status" className="w-full text-sm text-muted-foreground"><Trans>Saved.</Trans></p>}
      {state === 'failed' && <p role="alert" className="w-full text-sm text-destructive"><Trans>Couldn’t save. Please try again.</Trans></p>}
    </SettingsCard>
  );
}
