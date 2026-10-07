'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  submitLabel: string;
  children?: ReactNode;
  // throw to show an error; resolve to close
  onSubmit: (name: string) => Promise<void>;
};

// NameDialog asks for a single name, e.g. "New project" or "New board".
export function NameDialog({ open, onOpenChange, title, description, placeholder, submitLabel, children, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(name.trim());
      setName('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(''); }}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <Input autoFocus required maxLength={120} placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)} />
          {children}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Saving…' : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
