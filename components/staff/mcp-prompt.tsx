'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { When } from '@/components/common/when';
import { MarkdownTextarea } from '@/components/common/markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApiError, staff, type McpPromptVersion } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';

// MAX_PROMPT: the backend's mcp.MaxPrompt
export const MAX_PROMPT = 20000;

// canPublish: there's text, it's within the limit, and it isn't the current version.
export const canPublish = (draft: string, current: string | undefined) => {
  const text = draft.trim();
  return text !== '' && text.length <= MAX_PROMPT && text !== (current ?? '').trim();
};

// McpPromptEditor: the MCP pre-prompt (TL-674), versioned like the terms: edit it and publish a new version
// with a note of what changed; new agent sessions get it, and every version stays in the docs as it was.
export function McpPromptEditor() {
  const token = useToken();
  const { t } = useLingui();
  const [versions, setVersions] = useState<McpPromptVersion[] | null>(null);
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(0);
  const current = versions?.[0];
  const currentVersion = current?.version;
  function load() {
    if (!token) return;
    staff.mcpPrompt(token).then((r) => { setVersions(r.versions); setDraft(r.current?.body ?? ''); }, () => setError(t`Couldn’t load the pre-prompt. Please refresh to try again.`));
  }
  useEffect(load, [token !== null]); // load once; token refreshes must not refetch

  async function publish() {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const v = await staff.publishMcpPrompt(draft, note, token);
      setDone(v.version);
      setNote('');
      load();
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`Couldn’t publish it. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  if (!versions) return <p role={error ? 'alert' : 'status'} className="text-sm text-muted-foreground">{error || <Trans>Loading…</Trans>}</p>;
  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <div>
          <h2 className="text-lg font-semibold"><Trans>What agents are told when they connect</Trans></h2>
          <p className="text-sm text-muted-foreground">
            {current ? <Trans>Version {currentVersion}, published <When iso={current.published_at} />.</Trans> : <Trans>Nothing published yet: agents get the built-in text.</Trans>}{' '}
            <Trans>Publishing makes a new version: agents get it from their next session, and earlier versions stay in the docs as they were.</Trans>
          </p>
        </div>
        <MarkdownTextarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={18} maxLength={MAX_PROMPT} aria-label={t`MCP pre-prompt`} />
        <label className="grid max-w-xl gap-1.5 text-sm font-medium">
          <Trans>What changed</Trans>
          <Input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t`e.g. Ask agents to run the whole test suite`} />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {done > 0 && !error && <p role="status" className="text-sm text-muted-foreground"><Trans>Version {done} published.</Trans></p>}
        <Button className="w-fit" disabled={busy || !canPublish(draft, current?.body)} onClick={() => void publish()}>
          {busy ? t`Publishing…` : t`Publish new version`}
        </Button>
      </section>
      <McpPromptHistory versions={versions} />
    </div>
  );
}

// McpPromptHistory: every version, newest first, each with its page in the docs.
export function McpPromptHistory({ versions }: { versions: McpPromptVersion[] }) {
  if (versions.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold"><Trans>Versions</Trans></h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><Trans>Version</Trans></TableHead>
              <TableHead><Trans>Published</Trans></TableHead>
              <TableHead><Trans>By</Trans></TableHead>
              <TableHead><Trans>What changed</Trans></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.version}>
                <TableCell><Link href={`/docs/mcp/versions/${v.version}`} className="font-medium underline">{v.version}</Link></TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground"><When iso={v.published_at} /></TableCell>
                <TableCell className="text-muted-foreground">{v.published_by}</TableCell>
                <TableCell className="whitespace-normal">{v.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
