'use client';

import { plural } from '@lingui/core/macro';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { projects } from '@/lib/api';
import { addLabels, removeLabel } from '@/lib/labels';

// MoreLabels: the "+N" dropdown holding labels that didn't fit; nothing when there are none.
export function MoreLabels({ labels }: { labels: string[] }) {
  const { t } = useLingui();
  if (!labels.length) return null;
  const names = labels.join(', ');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Badge render={<button type="button" />} variant="outline" className="cursor-pointer hover:bg-muted" aria-label={t`${plural(labels.length, { one: '# more label', other: '# more labels' })}: ${names}`} />}>
        +{labels.length}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel><Trans>More labels</Trans></DropdownMenuLabel>
          {labels.map((label) => <DropdownMenuItem key={label.toLowerCase()}>{label}</DropdownMenuItem>)}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// splitLabels: the first max labels to show, and the rest for MoreLabels.
export function splitLabels(labels: string[] | undefined, max?: number): [string[], string[]] {
  const all = labels ?? [];
  return max && all.length > max ? [all.slice(0, max), all.slice(max)] : [all, []];
}

// max (lists): past it, the rest go in a "+N" dropdown rather than wrapping the row.
export function TicketLabels({ labels, className = '', max }: { labels?: string[]; className?: string; max?: number }) {
  const { t } = useLingui();
  if (!labels?.length) return null;
  const [shown, rest] = splitLabels(labels, max);
  return (
    <div aria-label={t`Ticket labels`} className={`flex min-w-0 flex-wrap gap-1 ${className}`}>
      {shown.map((label) => (
        <Badge key={label.toLowerCase()} variant="outline" title={label} className="max-w-40">
          <span className="truncate">{label}</span>
        </Badge>
      ))}
      <MoreLabels labels={rest} />
    </div>
  );
}

export function LabelEditor({ projectId, token, labels, onChange, disabled = false, showLabels = true }: {
  projectId: string;
  token: string;
  labels: string[];
  onChange: (labels: string[]) => void;
  disabled?: boolean;
  showLabels?: boolean;
}) {
  const { t, i18n } = useLingui();
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId || !token) return;
    let active = true;
    projects.labels(projectId, token).then((items) => {
      if (active) setSuggestions(items.map((item) => item.label));
    }, () => {
      if (active) setSuggestions([]);
    });
    return () => { active = false; };
  }, [projectId, token !== '']); // token refreshes must not refetch

  function add(raw: string) {
    if (!raw.trim()) return;
    const result = addLabels(i18n, labels, raw);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange(result.labels);
    setValue('');
    setError('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(value);
    }
  }

  const options = suggestions.filter((label) =>
    !labels.some((current) => current.toLowerCase() === label.toLowerCase()) &&
    (!value.trim() || label.toLowerCase().includes(value.trim().toLowerCase())),
  );

  return (
    <section className="grid gap-2" aria-label={t`Edit ticket labels`}>
      <p className="text-sm font-medium"><Trans>Labels <span className="font-normal text-muted-foreground">(optional)</span></Trans></p>
      {showLabels && <div className="flex min-w-0 flex-wrap gap-1.5">
        {labels.map((label) => (
          <Badge key={label.toLowerCase()} variant="outline" title={label} className="max-w-48 pr-1">
            <span className="truncate">{label}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t`Remove label ${label}`}
              disabled={disabled}
              onClick={() => { onChange(removeLabel(labels, label)); setError(''); }}
              className="ml-0.5 size-4 rounded-full text-muted-foreground"
            >
              <XIcon className="size-3" aria-hidden />
            </Button>
          </Badge>
        ))}
      </div>}
      <div className="grid gap-1.5">
        <div className="flex gap-2">
          <Input
            value={value}
            disabled={disabled}
            aria-label={t`Add a label`}
            placeholder={t`Type a label and press Enter or comma`}
            onChange={(event) => { setValue(event.target.value); setError(''); }}
            onKeyDown={onKeyDown}
          />
          <Button type="button" variant="outline" disabled={disabled || !value.trim()} onClick={() => add(value)}><Trans>Add</Trans></Button>
        </div>
        {options.length > 0 && (
          <div role="group" aria-label={t`Suggested labels`} className="flex flex-wrap gap-1">
            {options.slice(0, 8).map((label) => (
              <Button key={label.toLowerCase()} type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => add(label)}>
                {label}
              </Button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  );
}

export function LabelDrawer({ projectId, token, labels, onChange, disabled = false, onSave, saveLabel }: {
  projectId: string;
  token: string;
  labels: string[];
  onChange: (labels: string[]) => void;
  disabled?: boolean;
  onSave?: () => void | Promise<void>;
  saveLabel?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TicketLabels labels={labels} />
        <Drawer swipeDirection="right">
          <DrawerTrigger render={<Button type="button" variant="outline" size="sm" disabled={disabled} />}>
            {labels.length ? <Trans>Edit labels</Trans> : <Trans>Add labels</Trans>}
          </DrawerTrigger>
          <DrawerContent className="p-4">
            <DrawerHeader className="px-0 pt-0">
              <DrawerTitle><Trans>Labels</Trans></DrawerTitle>
              <DrawerDescription><Trans>Add labels to organise and find this ticket.</Trans></DrawerDescription>
            </DrawerHeader>
            <LabelEditor projectId={projectId} token={token} labels={labels} onChange={onChange} disabled={disabled} />
            <DrawerFooter className="px-0 pb-0">
              <DrawerClose render={<Button type="button" disabled={disabled} onClick={() => { void onSave?.(); }} />}>
                {saveLabel ?? <Trans>Done</Trans>}
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
