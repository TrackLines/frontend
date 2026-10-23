'use client';

import Link from 'next/link';
import { useFlags } from '@flags-gg/react-library';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BoardLifecycle } from '@/components/board/board-lifecycle';
import { ColumnList } from '@/components/board/column-list';
import { SprintBar } from '@/components/board/sprint-bar';
import { NameDialog } from '@/components/name-dialog';
import { BoardSkeleton } from '@/components/page-skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiError, boards, boardTemplates, columns, organization, type Board, type BoardStyle } from '@/lib/api';
import { canManageBoard } from '@/lib/board-access';
import { devComplete, devCompleteOptions, dirty, draftOf, layout, layoutChanged, problem, settingsPatch, type Draft } from '@/lib/board-edit';
import { SCALES, type EstimateScale } from '@/lib/estimates';
import { useToken } from '@/lib/use-token';

// EditBoardPage: /boards/<id>/edit (TL-470). The board's settings and its columns on their own page,
// without its tickets. Nothing is saved until Save; Cancel (or leaving) drops the changes. The sprint's
// length and goal, templates, archiving and deleting act straight away, as they always have.
export default function EditBoardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const token = useToken();
  const { is } = useFlags();
  const [board, setBoard] = useState<Board | null>(null);
  const [was, setWas] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [role, setRole] = useState<{ admin: boolean; leads: string[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  async function load() {
    try {
      const [b, me] = await Promise.all([boards.get(id, token), organization.me(token)]);
      setBoard(b);
      setRole(me);
      const d = draftOf(b);
      setWas(d);
      setDraft(d);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => { if (token) void load(); }, [id, token !== null]); // token refreshes mustn't wipe the draft

  const changed = !!draft && !!was && dirty(draft, was);
  useEffect(() => { // leaving with unsaved changes asks first
    if (!changed) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed]);

  if (loadError) return <p className="p-8 text-destructive" role="alert">Couldn&apos;t load this board. Please refresh to try again.</p>;
  if (!board || !draft || !was || !token || !role) return <BoardSkeleton />;
  const back = `/boards/${board.id}`;
  if (!canManageBoard(role, board.team_id) || board.archived_at) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted-foreground">{board.archived_at ? 'This board is archived: restore it to change it.' : 'Only organization admins and this board’s team leaders can edit it.'}</p>
        <Link href={back} className="mt-4 inline-block text-sm hover:underline">← Back to the board</Link>
      </main>
    );
  }
  const estimated = (board.columns ?? []).flatMap((c) => c.tickets).filter((t) => t.estimate).length;
  const clearsEstimates = draft.scale !== was.scale && estimated > 0;

  async function save() {
    if (!draft || !was || !board) return;
    const why = problem(draft);
    if (why) return setError(why);
    if (clearsEstimates && !confirm(`Changing the estimate scale clears ${estimated} ${estimated === 1 ? 'estimate' : 'estimates'} on open tickets. Save anyway?`)) return;
    setSaving(true);
    setError('');
    try {
      const patch = settingsPatch(draft, was);
      if (patch) await boards.update(board.id, patch, token!);
      if (layoutChanged(draft, was)) await columns.layout(board.id, layout(draft), token!);
      router.push(back);
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 && err.message ? err.message : 'Couldn’t save the board. Please try again.');
      void load(); // what did save is now the starting point; the rest is still in the draft
    } finally {
      setSaving(false);
    }
  }
  const leave = () => { if (!changed || confirm('Leave without saving your changes?')) router.push(back); };

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-6 py-10">
      <header className="grid gap-2">
        <button type="button" onClick={leave} className="w-fit text-sm text-muted-foreground hover:underline">← Back to the board</button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Edit {was.name}</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={leave}>Cancel</Button>
            <Button type="button" disabled={saving || !changed} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </header>

      <section aria-labelledby="settings" className="grid gap-4">
        <h2 id="settings" className="text-lg font-semibold">Settings</h2>
        <label className="grid gap-1.5 text-sm font-medium">
          Name
          <Input value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="max-w-sm" />
        </label>
        <Choice label="Style" hint="Sprints: time boxes. Kanban: continuous flow." value={draft.style}
          options={[['sprints', 'Sprints'], ['kanban', 'Kanban']]} onChange={(v) => setDraft({ ...draft, style: v as BoardStyle })} />
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium">Estimates</span>
          <Select items={Object.fromEntries(SCALES.map((s) => [s.value, s.label]))} value={draft.scale} onValueChange={(v) => v && setDraft({ ...draft, scale: v as EstimateScale })}>
            <SelectTrigger aria-label="Estimate scale" className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{SCALES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          {clearsEstimates && <span role="status" className="text-destructive">Saving clears {estimated} {estimated === 1 ? 'estimate' : 'estimates'} on open tickets.</span>}
        </div>
        <Choice label="Agent work needs review" hint="An AI agent's ticket moved to Done waits for a person to approve it." value={draft.agentReview ? 'on' : 'off'}
          options={[['off', 'Off'], ['on', 'On']]} onChange={(v) => setDraft({ ...draft, agentReview: v === 'on' })} />
        {is('release-done').enabled() && (
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium">Finish tickets on release</span>
            <Select items={{ merge: 'On merge', ...Object.fromEntries(devCompleteOptions(draft).map((c) => [c.id!, c.name])) }} value={devComplete(draft) || 'merge'}
              onValueChange={(v) => setDraft({ ...draft, devComplete: !v || v === 'merge' ? '' : v })}>
              <SelectTrigger aria-label="Finish tickets on release" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">On merge</SelectItem>
                {devCompleteOptions(draft).map((c) => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">On merge: a merged pull request moves its tickets to Done. Pick a column and they go there instead, then to Done once a GitHub release ships them.</span>
          </div>
        )}
      </section>

      <section aria-labelledby="columns" className="grid gap-3">
        <h2 id="columns" className="text-lg font-semibold">Columns</h2>
        <p className="text-sm text-muted-foreground">Drag to reorder. WIP limits are for the columns in between: the first is waiting work, and the last is Done.</p>
        <ColumnList draft={draft} onChange={setDraft} />
      </section>

      {(draft.style === 'sprints' && board.style === 'sprints') && (
        <section aria-labelledby="sprint" className="grid gap-2">
          <h2 id="sprint" className="text-lg font-semibold">Current sprint</h2>
          <p className="text-sm text-muted-foreground">Changing the length or goal applies straight away.</p>
          <div className="rounded-xl border"><SprintBar board={board} token={token} canManage editMode onChanged={() => void load()} /></div>
        </section>
      )}

      <section aria-labelledby="more" className="grid gap-2">
        <h2 id="more" className="text-lg font-semibold">More</h2>
        <p className="text-sm text-muted-foreground">These act straight away.</p>
        <div className="flex flex-wrap gap-2">
          {role.admin && <Button type="button" variant="outline" size="sm" onClick={() => setSavingTemplate(true)}>Save as template</Button>}
          <BoardLifecycle board={board} isAdmin={role.admin} canManage token={token} />
        </div>
      </section>

      <NameDialog
        open={savingTemplate}
        onOpenChange={setSavingTemplate}
        title="Save as template"
        description="New boards can start with this board's columns, WIP limits, style and estimate scale, as last saved. Tickets aren't copied."
        placeholder="e.g. Our delivery flow"
        initialValue={board.name}
        submitLabel="Save template"
        onSubmit={async (name) => {
          await boardTemplates.saveBoard(name, board.id, token).catch((err) => {
            throw new Error(err instanceof ApiError && err.status === 403 ? 'Only organization admins can save templates.' : 'Couldn’t save the template. Please try again.');
          });
        }}
      />
    </main>
  );
}

function Choice({ label, hint, value, options, onChange }: { label: string; hint: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <ToggleGroup size="sm" variant="outline" aria-label={label} value={[value]} onValueChange={(v) => { if (v[0]) onChange(v[0]); }} className="w-fit">
        {options.map(([v, l]) => <ToggleGroupItem key={v} value={v}>{l}</ToggleGroupItem>)}
      </ToggleGroup>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}
