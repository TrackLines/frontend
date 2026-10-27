'use client';

import { MarkdownTextarea } from '@/components/common/markdown';
import { usePathname } from 'next/navigation';
import { Trans, useLingui } from '@lingui/react/macro';
import { plural } from '@lingui/core/macro';
import { useEffect, useState, type FormEvent } from 'react';
import { SimilarTickets, useSimilarTickets } from '@/components/ticket/similar-tickets';
import { attachAll, PendingAttachments, type PendingFile } from '@/components/ticket/pending-attachments';
import { TypePicker } from '@/components/ticket/ticket-type';
import { LabelDrawer } from '@/components/ticket/labels';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { backlog, boards, projects, type Project, type TicketType } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';
import { TICKET_DIALOG_WIDTH } from '@/components/board/ticket-dialog';

// Fired after a quick-add so an open backlog list can refresh itself.
export const BACKLOG_CHANGED = 'tracklines:backlog-changed';

// scopeFor works out where the header's "New ticket" lands from the current URL:
// dashboard → pick a project; project page → that project; board page → the board's project.
export function scopeFor(path: string): { kind: 'pick' } | { kind: 'project'; id: string } | { kind: 'board'; id: string } | null {
  if (path === '/dashboard') return { kind: 'pick' };
  const m = path.match(/^\/(projects|boards)\/([^/]+)$/);
  if (!m) return null;
  return m[1] === 'projects' ? { kind: 'project', id: m[2] } : { kind: 'board', id: m[2] };
}

// QuickAddTicket is the header's "New ticket" button: always files into a project backlog.
export function QuickAddTicket() {
  const { t } = useLingui();
  const scope = scopeFor(usePathname());
  const [open, setOpen] = useState(false);
  if (!scope) return null;
  return (
    <>
      <Button size="sm" aria-label={t`New ticket`} onClick={() => setOpen(true)}>
        <PlusIcon aria-hidden /><span className="hidden sm:inline"><Trans>New ticket</Trans></span>
      </Button>
      {open && <QuickAddDialog scope={scope} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAddDialog({ scope, onClose }: { scope: NonNullable<ReturnType<typeof scopeFor>>; onClose: () => void }) {
  const { t } = useLingui();
  const token = useToken();
  const [choices, setChoices] = useState<Project[] | null>(null); // dashboard only
  const [projectId, setProjectId] = useState(scope.kind === 'project' ? scope.id : '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('bug');
  const [labels, setLabels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const similar = useSimilarTickets(title, projectId || undefined, token);

  const loaded = token !== null;
  useEffect(() => {
    if (!loaded) return;
    if (scope.kind === 'pick') projects.list(token).then((ps) => { setChoices(ps); if (ps.length) setProjectId(ps[0].id); }, () => setError(t`Couldn’t load your projects.`));
    if (scope.kind === 'board') boards.get(scope.id, token).then((b) => setProjectId(b.project_id), () => setError(t`Couldn’t find this board’s project.`));
  }, [loaded]); // load once; token refreshes must not refetch

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !projectId) return;
    setSaving(true);
    setError('');
    try {
      const tk = await backlog.create(projectId, { title: title.trim(), description: description.trim(), type, labels }, token);
      const failed = await attachAll(tk.id, files, token);
      setFiles([]);
      if (failed) setError(t`${plural(failed, { one: '# file didn’t attach — add it from the ticket.', other: '# files didn’t attach — add them from the ticket.' })}`);
      window.dispatchEvent(new CustomEvent(BACKLOG_CHANGED, { detail: { projectId } }));
      const where = choices?.find((p) => p.id === projectId)?.name;
      const added = tk.title;
      setAdded(where ? t`Added “${added}” to ${where}’s backlog.` : t`Added “${added}” to the backlog.`);
      setTitle('');
      setDescription('');
      setLabels([]);
    } catch {
      setError(t`Couldn’t add the ticket. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${TICKET_DIALOG_WIDTH}`}>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle><Trans>New ticket</Trans></DialogTitle>
            <DialogDescription><Trans>Goes into the project backlog — move it onto a board when a team picks it up.</Trans></DialogDescription>
          </DialogHeader>
          {scope.kind === 'pick' && (
            <label className="grid gap-1.5 text-sm font-medium">
              <Trans>Project</Trans>
              <Select items={Object.fromEntries((choices ?? []).map((p) => [p.id, p.name]))} value={projectId || null} onValueChange={(v) => v && setProjectId(String(v))} disabled={!choices}>
                <SelectTrigger className="w-full" aria-label={t`Project`}>
                  <SelectValue placeholder={choices ? t`Choose a project` : t`Loading…`} />
                </SelectTrigger>
                <SelectContent>
                  {choices?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          )}
          <TypePicker value={type} onChange={setType} />
          <LabelDrawer projectId={projectId} token={token ?? ''} labels={labels} onChange={setLabels} disabled={!token || saving} />
          <Input autoFocus required maxLength={200} placeholder={t`What's wrong / what's needed?`} value={title} onChange={(e) => setTitle(e.target.value)} />
          <SimilarTickets suggestions={similar} description={description} />
          <MarkdownTextarea
            placeholder={t`Details (optional)`}
            value={description}
            mentions={token ?? undefined}
            onChange={(e) => setDescription(e.target.value)}
          />
          <PendingAttachments files={files} onChange={setFiles} projectId={projectId} />
          {added && <p role="status" className="text-sm text-muted-foreground">{added}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}><Trans>Done</Trans></Button>
            <Button type="submit" disabled={saving || !title.trim() || !projectId}>{saving ? <Trans>Adding…</Trans> : <Trans>Add to backlog</Trans>}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
