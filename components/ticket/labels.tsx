'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { projects } from '@/lib/api';
import { addLabels, removeLabel } from '@/lib/labels';

export function TicketLabels({ labels, className = '' }: { labels?: string[]; className?: string }) {
  if (!labels?.length) return null;
  return (
    <div aria-label="Ticket labels" className={`flex min-w-0 flex-wrap gap-1 ${className}`}>
      {labels.map((label) => (
        <Badge key={label.toLowerCase()} variant="outline" title={label} className="max-w-40">
          <span className="truncate">{label}</span>
        </Badge>
      ))}
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
  }, [projectId, token]);

  function add(raw: string) {
    if (!raw.trim()) return;
    const result = addLabels(labels, raw);
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
    <section className="grid gap-2" aria-label="Edit ticket labels">
      <p className="text-sm font-medium">Labels <span className="font-normal text-muted-foreground">(optional)</span></p>
      {showLabels && <div className="flex min-w-0 flex-wrap gap-1.5">
        {labels.map((label) => (
          <Badge key={label.toLowerCase()} variant="outline" title={label} className="max-w-48 pr-1">
            <span className="truncate">{label}</span>
            <button
              type="button"
              aria-label={`Remove label ${label}`}
              disabled={disabled}
              onClick={() => { onChange(removeLabel(labels, label)); setError(''); }}
              className="ml-1 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <XIcon className="size-3" aria-hidden />
            </button>
          </Badge>
        ))}
      </div>}
      <div className="grid gap-1.5">
        <div className="flex gap-2">
          <Input
            value={value}
            disabled={disabled}
            aria-label="Add a label"
            placeholder="Type a label and press Enter or comma"
            onChange={(event) => { setValue(event.target.value); setError(''); }}
            onKeyDown={onKeyDown}
          />
          <Button type="button" variant="outline" disabled={disabled || !value.trim()} onClick={() => add(value)}>Add</Button>
        </div>
        {options.length > 0 && (
          <div role="group" aria-label="Suggested labels" className="flex flex-wrap gap-1">
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
