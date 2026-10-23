'use client';

import Link from 'next/link';
import { plural } from '@lingui/core/macro';
import { Plural, Trans, useLingui } from '@lingui/react/macro';
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
  const { t, i18n } = useLingui();
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

  if (loadError) return <p className="p-8 text-destructive" role="alert"><Trans>Couldn&apos;t load this board. Please refresh to try again.</Trans></p>;
  if (!board || !draft || !was || !token || !role) return <BoardSkeleton />;
  const back = `/boards/${board.id}`;
  if (!canManageBoard(role, board.team_id) || board.archived_at) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-muted-foreground">{board.archived_at ? t`This board is archived: restore it to change it.` : t`Only organization admins and this board’s team leaders can edit it.`}</p>
        <Link href={back} className="mt-4 inline-block text-sm hover:underline">← <Trans>Back to the board</Trans></Link>
      </main>
    );
  }
  const estimated = (board.columns ?? []).flatMap((c) => c.tickets).filter((tk) => tk.estimate).length;
  const clearsEstimates = draft.scale !== was.scale && estimated > 0;

  async function save() {
    if (!draft || !was || !board) return;
    const why = problem(draft, i18n);
    if (why) return setError(why);
    if (clearsEstimates && !confirm(t`Changing the estimate scale clears ${plural(estimated, { one: '# estimate', other: '# estimates' })} on open tickets. Save anyway?`)) return;
    setSaving(true);
    setError('');
    try {
      const patch = settingsPatch(draft, was);
      if (patch) await boards.update(board.id, patch, token!);
      if (layoutChanged(draft, was)) await columns.layout(board.id, layout(draft), token!);
      router.push(back);
    } catch (err) {
      setError(err instanceof ApiError && err.status < 500 && err.message ? err.message : t`Couldn’t save the board. Please try again.`);
      void load(); // what did save is now the starting point; the rest is still in the draft
    } finally {
      setSaving(false);
    }
  }
  const leave = () => { if (!changed || confirm(t`Leave without saving your changes?`)) router.push(back); };

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-6 py-10">
      <header className="grid gap-2">
        <button type="button" onClick={leave} className="w-fit text-sm text-muted-foreground hover:underline">← <Trans>Back to the board</Trans></button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight"><Trans>Edit {was.name}</Trans></h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={leave}><Trans>Cancel</Trans></Button>
            <Button type="button" disabled={saving || !changed} onClick={() => void save()}>{saving ? t`Saving…` : t`Save`}</Button>
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </header>

      <section aria-labelledby="settings" className="grid gap-4">
        <h2 id="settings" className="text-lg font-semibold"><Trans>Settings</Trans></h2>
        <label className="grid gap-1.5 text-sm font-medium">
          <Trans>Name</Trans>
          <Input value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="max-w-sm" />
        </label>
        <Choice label={t`Style`} hint={t`Sprints: time boxes. Kanban: continuous flow.`} value={draft.style}
          options={[['sprints', t`Sprints`], ['kanban', t`Kanban`]]} onChange={(v) => setDraft({ ...draft, style: v as BoardStyle })} />
        <div className="grid gap-1.5 text-sm">
          <span className="font-medium"><Trans>Estimates</Trans></span>
          <Select items={Object.fromEntries(SCALES.map((s) => [s.value, i18n._(s.label)]))} value={draft.scale} onValueChange={(v) => v && setDraft({ ...draft, scale: v as EstimateScale })}>
            <SelectTrigger aria-label={t`Estimate scale`} className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{SCALES.map((s) => <SelectItem key={s.value} value={s.value}>{i18n._(s.label)}</SelectItem>)}</SelectContent>
          </Select>
          {clearsEstimates && <span role="status" className="text-destructive"><Trans>Saving clears <Plural value={estimated} one="# estimate" other="# estimates" /> on open tickets.</Trans></span>}
        </div>
        <Choice label={t`Agent work needs review`} hint={t`An AI agent's ticket moved to Done waits for a person to approve it.`} value={draft.agentReview ? 'on' : 'off'}
          options={[['off', t`Off`], ['on', t`On`]]} onChange={(v) => setDraft({ ...draft, agentReview: v === 'on' })} />
        {is('release-done').enabled() && (
          <div className="grid gap-1.5 text-sm">
            <span className="font-medium"><Trans>Finish tickets on release</Trans></span>
            <Select items={{ merge: t`On merge`, ...Object.fromEntries(devCompleteOptions(draft).map((c) => [c.id!, c.name])) }} value={devComplete(draft) || 'merge'}
              onValueChange={(v) => setDraft({ ...draft, devComplete: !v || v === 'merge' ? '' : v })}>
              <SelectTrigger aria-label={t`Finish tickets on release`} className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="merge"><Trans>On merge</Trans></SelectItem>
                {devCompleteOptions(draft).map((c) => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground"><Trans>On merge: a merged pull request moves its tickets to Done. Pick a column and they go there instead, then to Done once a GitHub release ships them.</Trans></span>
          </div>
        )}
      </section>

      <section aria-labelledby="columns" className="grid gap-3">
        <h2 id="columns" className="text-lg font-semibold"><Trans>Columns</Trans></h2>
        <p className="text-sm text-muted-foreground"><Trans>Drag to reorder. WIP limits are for the columns in between: the first is waiting work, and the last is Done.</Trans></p>
        <ColumnList draft={draft} onChange={setDraft} />
      </section>

      {(draft.style === 'sprints' && board.style === 'sprints') && (
        <section aria-labelledby="sprint" className="grid gap-2">
          <h2 id="sprint" className="text-lg font-semibold"><Trans>Current sprint</Trans></h2>
          <p className="text-sm text-muted-foreground"><Trans>Changing the length or goal applies straight away.</Trans></p>
          <div className="rounded-xl border"><SprintBar board={board} token={token} canManage editMode onChanged={() => void load()} /></div>
        </section>
      )}

      <section aria-labelledby="more" className="grid gap-2">
        <h2 id="more" className="text-lg font-semibold"><Trans>More</Trans></h2>
        <p className="text-sm text-muted-foreground"><Trans>These act straight away.</Trans></p>
        <div className="flex flex-wrap gap-2">
          {role.admin && <Button type="button" variant="outline" size="sm" onClick={() => setSavingTemplate(true)}><Trans>Save as template</Trans></Button>}
          <BoardLifecycle board={board} isAdmin={role.admin} canManage token={token} />
        </div>
      </section>

      <NameDialog
        open={savingTemplate}
        onOpenChange={setSavingTemplate}
        title={t`Save as template`}
        description={t`New boards can start with this board's columns, WIP limits, style and estimate scale, as last saved. Tickets aren't copied.`}
        placeholder={t`e.g. Our delivery flow`}
        initialValue={board.name}
        submitLabel={t`Save template`}
        onSubmit={async (name) => {
          await boardTemplates.saveBoard(name, board.id, token).catch((err) => {
            throw new Error(err instanceof ApiError && err.status === 403 ? t`Only organization admins can save templates.` : t`Couldn’t save the template. Please try again.`);
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
