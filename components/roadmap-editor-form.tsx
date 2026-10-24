'use client';

import { Trans, useLingui } from '@lingui/react/macro';
import { Textarea } from '@/components/ui/textarea';
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
  canPublish?: boolean; // org admins only (TL-432): others start, and stay, inside the organization
};

export function RoadmapEditorForm({ open, onOpenChange, projectId, onSubmit, canPublish = false }: Props) {
  const { t } = useLingui();
  const start: Visibility = canPublish ? 'public' : 'login_only';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>(start);
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
      setVisibility(start);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t`Something went wrong. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setError(''); }}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle><Trans>New roadmap</Trans></DialogTitle>
            <DialogDescription>
              {canPublish ? <Trans>Starts public by default — anyone with the link can read it.</Trans> : <Trans>Starts visible to your organization; an organization admin can make it public.</Trans>}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            required
            maxLength={120}
            placeholder={t`e.g. 2027 plan`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder={t`What's this roadmap about? (optional)`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <VisibilitySelect
            name="visibility"
            value={visibility}
            onChange={(v) => setVisibility(v)}
            canPublish={canPublish}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? t`Saving…` : t`Create roadmap`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
