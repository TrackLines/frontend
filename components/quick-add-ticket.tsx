'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { attachAll, PendingAttachments, type PendingFile } from '@/components/ticket/pending-attachments';
import { TypePicker } from '@/components/ticket-type';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { backlog, boards, projects, type Project, type TicketType } from '@/lib/api';
import { useToken } from '@/lib/use-token';

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
  const scope = scopeFor(usePathname());
  const [open, setOpen] = useState(false);
  if (!scope) return null;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>New ticket</Button>
      {open && <QuickAddDialog scope={scope} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickAddDialog({ scope, onClose }: { scope: NonNullable<ReturnType<typeof scopeFor>>; onClose: () => void }) {
  const token = useToken();
  const [choices, setChoices] = useState<Project[] | null>(null); // dashboard only
  const [projectId, setProjectId] = useState(scope.kind === 'project' ? scope.id : '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>('bug');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);

  const loaded = token !== null;
  useEffect(() => {
    if (!loaded) return;
    if (scope.kind === 'pick') projects.list(token).then((ps) => { setChoices(ps); if (ps.length) setProjectId(ps[0].id); }, () => setError('Couldn’t load your projects.'));
    if (scope.kind === 'board') boards.get(scope.id, token).then((b) => setProjectId(b.project_id), () => setError('Couldn’t find this board’s project.'));
  }, [loaded]); // load once; token refreshes must not refetch

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !projectId) return;
    setSaving(true);
    setError('');
    try {
      const t = await backlog.create(projectId, { title: title.trim(), description: description.trim(), type }, token);
      const failed = await attachAll(t.id, files, token);
      setFiles([]);
      if (failed) setError(`${failed} file(s) didn’t attach — add them from the ticket.`);
      window.dispatchEvent(new CustomEvent(BACKLOG_CHANGED, { detail: { projectId } }));
      const where = choices?.find((p) => p.id === projectId)?.name;
      setAdded(`Added “${t.title}” to ${where ? `${where}’s` : 'the'} backlog.`);
      setTitle('');
      setDescription('');
    } catch {
      setError('Couldn’t add the ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New ticket</DialogTitle>
            <DialogDescription>Goes into the project backlog — move it onto a board when a team picks it up.</DialogDescription>
          </DialogHeader>
          {scope.kind === 'pick' && (
            <label className="grid gap-1.5 text-sm font-medium">
              Project
              <Select items={Object.fromEntries((choices ?? []).map((p) => [p.id, p.name]))} value={projectId || null} onValueChange={(v) => v && setProjectId(String(v))} disabled={!choices}>
                <SelectTrigger className="w-full" aria-label="Project">
                  <SelectValue placeholder={choices ? 'Choose a project' : 'Loading…'} />
                </SelectTrigger>
                <SelectContent>
                  {choices?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          )}
          <TypePicker value={type} onChange={setType} name="quick-add-type" />
          <Input autoFocus required maxLength={200} placeholder="What's wrong / what's needed?" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Details (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <PendingAttachments files={files} onChange={setFiles} />
          {added && <p role="status" className="text-sm text-muted-foreground">{added}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Done</Button>
            <Button type="submit" disabled={saving || !title.trim() || !projectId}>{saving ? 'Adding…' : 'Add to backlog'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
