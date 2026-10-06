'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { VisibilitySelect } from '@/components/roadmap/visibility';
import type { Visibility } from '@/lib/api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Resolved promise = close; throw = show error */
  onSubmit: (r: { title: string; description?: string; visibility?: Visibility }) => Promise<void>;
};

export function RoadmapEditorForm({ open, onOpenChange, projectId, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), visibility });
      setTitle('');
      setDescription('');
      setVisibility('public');
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
            <DialogTitle>New roadmap</DialogTitle>
            <DialogDescription>Starts public by default — anyone with the link can read it.</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            required
            maxLength={120}
            placeholder="e.g. 2027 plan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="flex min-h-[3rem] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="What's this roadmap about? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <VisibilitySelect
            name="visibility"
            value={visibility}
            onChange={(v) => setVisibility(v)}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? 'Saving…' : 'Create roadmap'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
