'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/common/copy-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { agentInstructions, ApiError, type AgentInstructions } from '@/lib/api';
import { draftState } from '@/lib/org/agent-instructions';

const block = 'max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap';

// AgentInstructionsForm (TL-901): the editor, an example to copy, and what agents are told: the standard
// instructions, then this organization's own (the draft, marked as unsaved until it's saved).
export function AgentInstructionsForm({ saved, draft, onChange, disabled = false }: {
  saved: AgentInstructions; draft: string; onChange: (text: string) => void; disabled?: boolean;
}) {
  const { t, i18n } = useLingui();
  const d = draftState(draft, saved.instructions, saved.max_length);
  const example = t`Follow the Boy Scout rule: leave code you touch clearer and easier to maintain. Make small, relevant improvements alongside the ticket work, and avoid unrelated refactoring.`;
  const used = i18n.number(d.length), limit = i18n.number(saved.max_length);
  return (
    <div className="grid gap-6 text-sm">
      <div className="grid gap-2 text-muted-foreground">
        <p><Trans>This text is added after TrackLin.es’ standard instructions whenever an AI agent connects to this organization over MCP. It applies to this organization only, and it’s empty unless you write something.</Trans></p>
        <p><Trans>More instructions mean more tokens on every connection, and can mean agents do more work on each ticket.</Trans></p>
        <p><Trans>Agents read instructions when they connect, so an agent that’s already connected may need to reconnect to get a change.</Trans></p>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="agent-instructions" className="font-medium"><Trans>Additional agent instructions</Trans></label>
        <Textarea id="agent-instructions" rows={6} value={draft} disabled={disabled} aria-invalid={d.tooLong || undefined}
          aria-describedby="agent-instructions-count" onChange={(e) => onChange(e.target.value)} />
        <p id="agent-instructions-count" className={d.tooLong ? 'text-destructive' : 'text-muted-foreground'}><Trans>{used} of {limit} characters</Trans></p>
        {d.tooLong && <p role="alert" className="text-destructive"><Trans>That’s too long: additional instructions can be up to {limit} characters.</Trans></p>}
      </div>
      <div className="grid gap-2">
        <h2 className="font-medium"><Trans>An example</Trans></h2>
        <p className="text-muted-foreground"><Trans>Copy it and paste it above if you want it. It’s never added for you.</Trans></p>
        <blockquote className="rounded-lg border p-3">{example}</blockquote>
        <CopyButton value={example} label={t`Copy example`} size="sm" className="w-fit" />
      </div>
      <div className="grid gap-3">
        <h2 className="font-medium"><Trans>What agents are told</Trans></h2>
        <section className="grid gap-1.5" aria-label={t`Standard instructions`}>
          <h3 className="text-muted-foreground">
            {saved.global_version ? <Trans>Standard instructions (version {saved.global_version}), for every organization</Trans> : <Trans>Standard instructions, for every organization</Trans>}
          </h3>
          <pre className={block}>{saved.global}</pre>
        </section>
        <section className="grid gap-1.5" aria-label={t`Your organization’s instructions`}>
          <h3 className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <Trans>Your organization’s instructions</Trans>
            {d.changed ? <Badge variant="outline"><Trans>Unsaved draft</Trans></Badge> : <Badge variant="secondary"><Trans>Saved</Trans></Badge>}
          </h3>
          {d.text
            ? <pre className={block}>{saved.heading}{'\n'}{d.text}</pre>
            : <p className="rounded-lg border border-dashed p-3 text-muted-foreground"><Trans>Nothing: agents get the standard instructions only.</Trans></p>}
          {d.changed && <p className="text-muted-foreground"><Trans>Agents keep getting the saved instructions until you save this draft.</Trans></p>}
        </section>
      </div>
    </div>
  );
}

// OrgAgentInstructions: loads the organization's instructions and saves or clears them. Remounted (keyed by
// organization on the page) when the active organization changes, so nothing carries over from another one.
export function OrgAgentInstructions({ token }: { token: string }) {
  const { t } = useLingui();
  const [saved, setSaved] = useState<AgentInstructions | null>(null);
  const [draft, setDraft] = useState('');
  const [state, setState] = useState<'' | 'saving' | 'saved' | 'cleared'>('');
  const [error, setError] = useState('');
  useEffect(() => {
    agentInstructions.get(token).then((v) => { setSaved(v); setDraft(v.instructions); }, () => setError(t`Couldn’t load the agent instructions. Please refresh to try again.`));
  }, [token !== null]); // load once
  if (!saved) return <p role={error ? 'alert' : 'status'} className="text-sm text-muted-foreground">{error || <Trans>Loading…</Trans>}</p>;
  const d = draftState(draft, saved.instructions, saved.max_length);
  async function save(text: string) {
    setState('saving');
    setError('');
    try {
      const next = await agentInstructions.set(text, token);
      setSaved(next);
      setDraft(next.instructions);
      setState(next.instructions ? 'saved' : 'cleared');
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`Couldn’t save the agent instructions. Please try again.`);
      setState('');
    }
  }
  return (
    <div className="grid gap-4">
      <AgentInstructionsForm saved={saved} draft={draft} onChange={(v) => { setDraft(v); setState(''); }} disabled={state === 'saving'} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={state === 'saving' || !d.changed || d.tooLong} onClick={() => void save(d.text)}>{state === 'saving' ? t`Saving…` : t`Save`}</Button>
        <Button variant="outline" disabled={state === 'saving' || !saved.instructions} onClick={() => void save('')}><Trans>Clear</Trans></Button>
        {state === 'saved' && <span role="status" className="text-sm text-muted-foreground"><Trans>Saved. New agent connections get it from now on.</Trans></span>}
        {state === 'cleared' && <span role="status" className="text-sm text-muted-foreground"><Trans>Cleared. Agents get the standard instructions only.</Trans></span>}
      </div>
    </div>
  );
}
