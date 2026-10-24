'use client';

import { useLingui } from '@lingui/react/macro';
import { useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { tickets } from '@/lib/api';
import { matchPeople, mentionAt, mentionPeople, mentionText, type MentionPerson } from '@/lib/mentions';

// MentionTextarea: our Textarea where typing @ lists the org's people (real name and username, both
// narrow it); arrows + Enter/Tab or a click types the mention. People load on the first @.
export function MentionTextarea({ token, people: given, onKeyDown, onBlur, ...props }: ComponentProps<typeof Textarea> & { token: string; people?: MentionPerson[] }) {
  const { t } = useLingui();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [people, setPeople] = useState<MentionPerson[] | null>(given ?? null);
  const [at, setAt] = useState<{ start: number; query: string } | null>(null);
  const [active, setActive] = useState(0);
  const shown = at && people ? matchPeople(people, at.query).slice(0, 8) : [];
  const open = shown.length > 0;

  function track() {
    const el = ref.current;
    const next = el && el.selectionStart === el.selectionEnd ? mentionAt(el.value, el.selectionStart) : null;
    if (next && !people) {
      setPeople([]); // loading: don't fetch twice
      tickets.assignees(token).then((list) => setPeople(mentionPeople(list)), () => setPeople(null));
    }
    if (next?.query !== at?.query) setActive(0);
    setAt(next);
  }

  function choose(p: MentionPerson) {
    const el = ref.current;
    if (!el || !at) return;
    el.focus();
    el.setRangeText(mentionText(p), at.start, el.selectionStart, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true })); // React sees it as typing: the caller's onChange runs
    setAt(null);
  }

  function keys(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : shown.length - 1)) % shown.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        choose(shown[Math.min(active, shown.length - 1)]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // close the list, not the dialog around it
        setAt(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <Textarea ref={ref} {...props} onKeyDown={keys} onKeyUp={track} onClick={track} onInput={track}
        onBlur={(e) => { setAt(null); onBlur?.(e); }}
        role={open ? 'combobox' : undefined} aria-expanded={open || undefined} aria-autocomplete="list"
        aria-controls={open ? `${props.id ?? 'mention'}-people` : undefined} />
      {open && (
        <ul id={`${props.id ?? 'mention'}-people`} role="listbox" aria-label={t`People`}
          className="absolute top-full left-0 z-50 mt-1 grid max-h-64 w-72 max-w-full overflow-y-auto rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {shown.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}
              className={`flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 ${i === active ? 'bg-accent text-accent-foreground' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }} onMouseEnter={() => setActive(i)}>
              <span className="truncate font-medium">{p.name}</span>
              {p.username && <span className="truncate text-muted-foreground">@{p.username}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
