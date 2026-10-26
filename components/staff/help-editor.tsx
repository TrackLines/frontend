'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HelpItem } from '@/components/help-bot';
import { Pager } from '@/components/pager';
import { useAct } from '@/components/settings/jira-import';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { staff, type HelpAnswer, type HelpAnswerInput } from '@/lib/api';
import { appRoute, PAGE_KINDS, type PageKind } from '@/lib/help';
import { LOCALES, type Locale } from '@/lib/i18n';
import { LANGUAGE_NAMES } from '@/lib/locale';
import { useToken } from '@/lib/use-token';

// missing: the languages an answer has no question or answer in (they're shown the English).
export const missing = (a: Pick<HelpAnswerInput, 'question' | 'answer'>): Locale[] =>
  LOCALES.filter((l) => l !== 'en' && (!a.question[l]?.trim() || !a.answer[l]?.trim()));

// problems: what's wrong with a form before it's sent (the backend checks the same).
export function problems(a: HelpAnswerInput): ('slug' | 'english' | 'href' | 'fallback')[] {
  const out: ('slug' | 'english' | 'href' | 'fallback')[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(a.slug)) out.push('slug');
  if (!a.question.en?.trim() || !a.answer.en?.trim()) out.push('english');
  if (!appRoute(a.href.trim())) out.push('href');
  if (!appRoute(a.fallback_href.trim())) out.push('fallback');
  return out;
}

// moved: the list with item i swapped one place up (-1) or down (+1).
export function moved<X>(list: X[], i: number, by: -1 | 1): X[] {
  const j = i + by;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// matches: whether an answer has the search in its slug, extra words, or a question or answer in any language.
export function matches(a: HelpAnswerInput, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || [a.slug, a.words, ...Object.values(a.question), ...Object.values(a.answer)].some((v) => v?.toLowerCase().includes(q));
}

const PER_PAGE = 10;

const blank: HelpAnswerInput = { slug: '', question: { en: '' }, answer: { en: '' }, href: '', fallback_href: '', pages: [], words: '', published: true };

// HelpEditor: the help panel's answers (TL-579): add, edit, reorder, publish and delete, in every language.
export function HelpEditor() {
  const token = useToken();
  const { t } = useLingui();
  const { busy, error, act } = useAct();
  const [list, setList] = useState<HelpAnswer[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<HelpAnswer | 'new' | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (token) staff.help(token).then(setList, () => setFailed(true));
  }, [token !== null]);
  if (failed) return <p role="alert" className="text-sm text-destructive"><Trans>Couldn’t load the help answers.</Trans></p>;
  if (!list || !token) return <p role="status" className="text-sm text-muted-foreground"><Trans>Loading…</Trans></p>;

  const reorder = (i: number, by: -1 | 1) => act(async () => {
    const next = moved(list, i, by);
    await staff.orderHelp(next.map((a) => a.id), token);
    setList(next);
  });
  const remove = (a: HelpAnswer) => {
    if (window.confirm(t`Delete “${a.question.en}”? It’s gone from the help panel at once.`)) {
      void act(async () => { await staff.deleteHelp(a.id, token); setList(list.filter((x) => x.id !== a.id)); });
    }
  };
  const save = async (form: HelpAnswerInput) => {
    if (editing === 'new') {
      const made = await staff.addHelp(form, token);
      setList([...list, made]);
    } else if (editing) {
      const changed = await staff.updateHelp(editing.id, form, token);
      setList(list.map((x) => (x.id === changed.id ? changed : x)));
    }
    setEditing(null);
  };

  // i stays the answer's place in the whole list, so moving works across pages; not while searching
  const found = list.map((a, i) => ({ a, i })).filter(({ a }) => matches(a, query));
  const lastPage = Math.max(1, Math.ceil(found.length / PER_PAGE));
  const current = Math.min(page, lastPage);

  if (editing) return <HelpForm initial={editing === 'new' ? blank : editing} onSave={save} onCancel={() => setEditing(null)} />;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground"><Trans>The answers in the help panel, in this order: the first ones for a page are suggested there before anyone types.</Trans></p>
        <Button size="sm" onClick={() => setEditing('new')}><Trans>Add an answer</Trans></Button>
      </div>
      <Input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder={t`Search the answers, in any language`} aria-label={t`Search the answers`} className="max-w-sm" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div id="help-answers">
        {query.trim() && found.length === 0
          ? <p className="text-sm text-muted-foreground"><Trans>No answers match.</Trans></p>
          : <HelpList items={found.slice((current - 1) * PER_PAGE, current * PER_PAGE)} total={list.length} reorder={!query.trim()} busy={busy} onMove={reorder} onEdit={setEditing} onDelete={remove} />}
        <Pager page={current} lastPage={lastPage} onPage={setPage} anchor="#help-answers" />
      </div>
    </div>
  );
}

// HelpList: one page of answers; i is each one's place in the whole list (total long), which moving uses.
export function HelpList({ items, total, reorder, busy, onMove, onEdit, onDelete }: {
  items: { a: HelpAnswer; i: number }[]; total: number; reorder: boolean; busy: boolean; onMove: (i: number, by: -1 | 1) => void; onEdit: (a: HelpAnswer) => void; onDelete: (a: HelpAnswer) => void;
}) {
  const { t } = useLingui();
  if (items.length === 0) return <p className="text-sm text-muted-foreground"><Trans>No answers yet.</Trans></p>;
  return (
    <ol className="divide-y rounded-xl border" start={items[0].i + 1}>
      {items.map(({ a, i }) => {
        const gaps = missing(a);
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            {reorder && (
              <div className="flex flex-col">
                <Button size="icon-xs" variant="ghost" aria-label={t`Move up`} disabled={busy || i === 0} onClick={() => onMove(i, -1)}><ArrowUpIcon /></Button>
                <Button size="icon-xs" variant="ghost" aria-label={t`Move down`} disabled={busy || i === total - 1} onClick={() => onMove(i, 1)}><ArrowDownIcon /></Button>
              </div>
            )}
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="font-medium">{a.question.en}</p>
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{a.slug}</span>
                {!a.published && <Badge variant="secondary"><Trans>Hidden</Trans></Badge>}
                {gaps.length > 0 && <Badge variant="outline" data-missing><Trans>Not translated: {gaps.join(', ')}</Trans></Badge>}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onEdit(a)}><Trans>Edit</Trans></Button>
              <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => onDelete(a)}><Trans>Delete</Trans></Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// HelpForm: one answer, a tab per language, with a preview of how it reads in the help panel.
export function HelpForm({ initial, onSave, onCancel }: { initial: HelpAnswerInput; onSave: (a: HelpAnswerInput) => Promise<void>; onCancel: () => void }) {
  const { t } = useLingui();
  const { busy, error, act } = useAct();
  const [form, setForm] = useState<HelpAnswerInput>(initial);
  const [lang, setLang] = useState<Locale>('en');
  const [tried, setTried] = useState(false);
  const wrong = problems(form);
  const gaps = missing(form);
  const set = (patch: Partial<HelpAnswerInput>) => setForm({ ...form, ...patch });
  const text = (field: 'question' | 'answer', l: Locale, v: string) => set({ [field]: { ...form[field], [l]: v } });
  const togglePage = (p: PageKind, on: boolean) => set({ pages: on ? PAGE_KINDS.filter((k) => k === p || form.pages.includes(k)) : form.pages.filter((k) => k !== p) });
  const pageNames: Record<PageKind, string> = { project: t`Project`, board: t`Board`, dashboard: t`Dashboard`, settings: t`Organization settings`, account: t`Your settings` };
  const submit = () => {
    setTried(true);
    if (wrong.length === 0) void act(() => onSave({ ...form, slug: form.slug.trim(), href: form.href.trim(), fallback_href: form.fallback_href.trim() }));
  };
  const show = (k: (typeof wrong)[number]) => tried && wrong.includes(k);

  return (
    <form className="grid gap-5 lg:grid-cols-[1fr_20rem]" onSubmit={(e) => { e.preventDefault(); submit(); }} data-help-form>
      <div className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium"><Trans>Slug</Trans></span>
          <Input value={form.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="add-board" aria-invalid={show('slug') || undefined} />
          {show('slug') && <span className="text-xs text-destructive"><Trans>Lower-case letters, digits and dashes.</Trans></span>}
        </label>

        <Tabs value={lang} onValueChange={(v) => setLang(v as Locale)}>
          <TabsList className="flex-wrap">
            {LOCALES.map((l) => <TabsTrigger key={l} value={l}>{LANGUAGE_NAMES[l]}{gaps.includes(l) && ' •'}</TabsTrigger>)}
          </TabsList>
          {LOCALES.map((l) => (
            <TabsContent key={l} value={l} className="grid gap-3 pt-3">
              <label className="grid gap-1 text-sm">
                <span className="font-medium"><Trans>Question</Trans></span>
                <Input value={form.question[l] ?? ''} onChange={(e) => text('question', l, e.target.value)} lang={l} />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium"><Trans>Answer</Trans></span>
                <Textarea value={form.answer[l] ?? ''} onChange={(e) => text('answer', l, e.target.value)} rows={4} lang={l} />
              </label>
            </TabsContent>
          ))}
        </Tabs>
        {show('english') && <p className="text-xs text-destructive"><Trans>The English question and answer are needed.</Trans></p>}
        {gaps.length > 0 && (
          <p className="text-xs text-muted-foreground" data-missing>
            <Trans>Not translated yet: {gaps.map((l) => LANGUAGE_NAMES[l]).join(', ')}. People reading those see the English.</Trans>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium"><Trans>Link</Trans></span>
            <Input value={form.href} onChange={(e) => set({ href: e.target.value })} placeholder="/projects/[project]/edit" aria-invalid={show('href') || undefined} />
            <span className={show('href') ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}><Trans>A page in the app, starting with /. [project] and [board] are the reader’s current one.</Trans></span>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium"><Trans>Fallback link</Trans></span>
            <Input value={form.fallback_href} onChange={(e) => set({ fallback_href: e.target.value })} placeholder="/dashboard" aria-invalid={show('fallback') || undefined} />
            <span className={show('fallback') ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}><Trans>Used when they aren’t on a project or board.</Trans></span>
          </label>
        </div>

        <fieldset className="grid gap-2 text-sm">
          <legend className="mb-1 font-medium"><Trans>Suggested on</Trans></legend>
          <div className="flex flex-wrap gap-4">
            {PAGE_KINDS.map((p) => (
              <label key={p} className="flex items-center gap-2">
                <Checkbox checked={form.pages.includes(p)} onCheckedChange={(on) => togglePage(p, on === true)} />
                {pageNames[p]}
              </label>
            ))}
          </div>
          <span className="text-xs text-muted-foreground"><Trans>None: suggested on other pages, like a ticket or My work.</Trans></span>
        </fieldset>

        <label className="grid gap-1 text-sm">
          <span className="font-medium"><Trans>Extra search words</Trans></span>
          <Input value={form.words} onChange={(e) => set({ words: e.target.value })} placeholder="new board create" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.published} onCheckedChange={(on) => set({ published: on === true })} />
          <Trans>Published: shown in the help panel</Trans>
        </label>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}><Trans>Save</Trans></Button>
          <Button type="button" variant="ghost" onClick={onCancel}><Trans>Cancel</Trans></Button>
        </div>
      </div>

      <aside className="grid content-start gap-2" aria-label={t`Preview`}>
        <p className="text-sm font-medium"><Trans>Preview ({LANGUAGE_NAMES[lang]})</Trans></p>
        <div className="rounded-lg border p-3 shadow-sm">
          <HelpItem pathname="/" entry={{
            question: form.question[lang]?.trim() || form.question.en || t`Question`,
            answer: form.answer[lang]?.trim() || form.answer.en || t`Answer`,
            href: appRoute(form.href.trim()) ? form.href.trim() : '',
            fallback_href: form.fallback_href.trim(),
          }} />
        </div>
      </aside>
    </form>
  );
}
