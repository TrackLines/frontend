'use client';

import Link from 'next/link';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError, importsApi, type CSVField, type ImportJob } from '@/lib/api';
import { CSV_FIELDS, guessMapping, headerOf, prefixFor } from '@/lib/org/csv-import';
import { useToken } from '@/lib/hooks/use-token';

const NONE = '-'; // a Select value for "not used"

// CSVImport: bring a spreadsheet of tickets in as a new project (TL-638, on TL-637): pick the file,
// name the project, map its columns, preview what it makes and what it leaves out, run it, and scrap
// it if it wasn't what you wanted.
export function CSVImport() {
  const token = useToken();
  const { t } = useLingui();
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<CSVField, string>>>({});
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // a running import is followed until it finishes
  useEffect(() => {
    if (!job || !token || (job.state !== 'running' && job.state !== 'cancelling')) return;
    const timer = setTimeout(() => void importsApi.get(job.id, token).then(setJob, () => {}), 1500);
    return () => clearTimeout(timer);
  }, [job, token]);

  async function pick(f: File | undefined) {
    if (!f) return;
    const text = await f.text();
    const hs = headerOf(text);
    setFile({ name: f.name, text });
    setHeaders(hs);
    setMapping(guessMapping(hs));
    const base = f.name.replace(/\.csv$/i, '').replace(/[-_]+/g, ' ');
    setName((n) => n || base);
    setPrefix((p) => p || prefixFor(base));
    setJob(null);
  }

  async function act(f: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await f();
    } catch (e) {
      setError(e instanceof ApiError && e.status < 500 ? e.message : t`That didn’t work. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  const labels: Record<CSVField, string> = {
    title: t`Title`, description: t`Description`, type: t`Type`, priority: t`Priority`, labels: t`Labels`,
    status: t`Status (becomes the board’s columns)`, due: t`Due date`, created: t`Created`,
  };
  const items = { [NONE]: t`Not used`, ...Object.fromEntries(headers.map((h) => [h, h])) };
  const ready = file && name.trim() && prefix.trim() && mapping.title;
  const blocked = (job?.problems?.length ?? 0) > 0;

  return (
    <div className="grid gap-6">
      <label className="grid gap-1.5 text-sm font-medium">
        <Trans>CSV file</Trans>
        <Input type="file" accept=".csv,text/csv" onChange={(e) => void pick(e.target.files?.[0])} />
        <span className="font-normal text-muted-foreground"><Trans>From Trello, Asana, Linear, Jira, a spreadsheet, or another TrackLin.es project’s export. Up to about 1 MB.</Trans></span>
      </label>

      {file && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium"><Trans>New project</Trans>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium"><Trans>Key prefix</Trans>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} maxLength={6} placeholder="OPS" />
            </label>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium"><Trans>Which column is which</Trans></legend>
            {CSV_FIELDS.map((f) => (
              <div key={f} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 text-sm" data-field={f}>
                <span>{labels[f]}{f === 'title' && <span className="text-destructive"> *</span>}</span>
                <Select items={items} value={mapping[f] ?? NONE} onValueChange={(v) => setMapping((m) => ({ ...m, [f]: v && v !== NONE ? String(v) : undefined }))}>
                  <SelectTrigger aria-label={labels[f]} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}><Trans>Not used</Trans></SelectItem>
                    {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </fieldset>
          <Button className="w-fit" disabled={!ready || busy} onClick={() => void act(async () => setJob(await importsApi.previewCSV({ csv: file.text, name: name.trim(), prefix: prefix.trim(), mapping }, token!)))}>
            <Trans>Preview</Trans>
          </Button>
        </>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {job && token && <ImportStatus job={job} busy={busy} blocked={blocked} onRun={() => void act(async () => setJob(await importsApi.run(job.id, token)))}
        {...importActions(job, token, act, setJob, t`Scrap this import? Everything it made is deleted.`)} />}
    </div>
  );
}

// importActions: cancelling a running import and scrapping a finished one (asking first), for ImportStatus.
export function importActions(job: ImportJob, token: string, act: (f: () => Promise<void>) => Promise<void>, setJob: (j: ImportJob) => void, confirmScrap: string) {
  return {
    onCancel: () => void act(async () => { await importsApi.cancel(job.id, token); setJob(await importsApi.get(job.id, token)); }),
    onScrap: () => window.confirm(confirmScrap) && void act(async () => { await importsApi.scrap(job.id, token); setJob(await importsApi.get(job.id, token)); }),
  };
}

// ImportStatus: a preview (what it makes, what stops it, what it leaves out), a run's progress (with
// Cancel), or its report, with Scrap while nobody has worked on what it made (TL-544). summary false:
// the caller shows what the preview makes itself (the Jira import's projects, boards and people).
export function ImportStatus({ job, busy, blocked, onRun, onCancel, onScrap, summary = true }: {
  job: ImportJob; busy: boolean; blocked: boolean; onRun: () => void; onCancel?: () => void; onScrap: () => void; summary?: boolean;
}) {
  const { t } = useLingui();
  const skipped = job.report?.skipped ?? job.skipped ?? [];
  const files = job.report?.created.attachments ?? 0;
  return (
    <section className="grid gap-3 rounded-lg border p-4 text-sm" aria-label={t`Import`} data-import-state={job.state}>
      {summary && job.state === 'previewing' && job.planned && (
        <p><Trans>This makes the project <strong>{job.projects?.[0]?.name}</strong> ({job.projects?.[0]?.prefix}) with {job.planned.tickets} tickets, {job.planned.boards} boards and {job.planned.columns} columns.</Trans></p>
      )}
      {(job.problems ?? []).length > 0 && (
        <div role="alert" className="grid gap-1">
          <p className="font-medium text-destructive"><Trans>Fix these first:</Trans></p>
          <ul className="list-disc pl-5">{job.problems!.map((p, i) => <li key={i}>{p.message}</li>)}</ul>
        </div>
      )}
      {(job.state === 'running' || job.state === 'cancelling') && (
        <div className="grid gap-1">
          <Progress value={job.total ? (100 * job.progress) / job.total : 0} />
          <p className="text-muted-foreground"><Trans>{job.progress} of {job.total} tickets…</Trans></p>
        </div>
      )}
      {job.state === 'done' && job.report && (
        <p><Badge variant="secondary"><Trans>Done</Trans></Badge> <Trans>Made {job.report.created.tickets} tickets on {job.report.created.boards} boards.</Trans>
          {files > 0 && <> <Trans>Copied {files} files.</Trans></>} <Link href="/dashboard" className="underline"><Trans>Go to your projects</Trans></Link></p>
      )}
      {job.state === 'cancelled' && <p><Trans>Cancelled: nothing was imported.</Trans></p>}
      {job.state === 'failed' && <p role="alert" className="text-destructive"><Trans>The import failed, and nothing was kept: {job.error}</Trans></p>}
      {job.state === 'scrapped' && <p><Trans>Scrapped: everything the import made is gone.</Trans></p>}
      {skipped.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted-foreground"><Trans>{skipped.length} rows or values left out</Trans></summary>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">{skipped.map((s, i) => <li key={i}>{s.source_id}: {s.reason}</li>)}</ul>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {job.state === 'previewing' && <Button disabled={busy || blocked} onClick={onRun}><Trans>Import</Trans></Button>}
        {job.state === 'running' && onCancel && <Button variant="outline" disabled={busy} onClick={onCancel}><Trans>Cancel</Trans></Button>}
        {job.state === 'done' && job.scrappable !== false && <Button variant="outline" disabled={busy} onClick={onScrap}><Trans>Scrap this import</Trans></Button>}
        {job.state === 'done' && job.scrappable === false && (
          <p className="text-muted-foreground" data-scrap-closed><Trans>It can’t be scrapped any more: someone has worked on what it made (moved, edited, commented on or reviewed a ticket, or added one).</Trans></p>
        )}
      </div>
    </section>
  );
}
