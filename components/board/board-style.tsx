'use client';

import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiError, boards, type BoardStyle } from '@/lib/api';

// StyleSetting switches a board between sprints (time boxes) and kanban (continuous flow).
export function StyleSetting({ boardId, style, token, onChanged }: { boardId: string; style: BoardStyle; token: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function change(next: BoardStyle) {
    setBusy(true);
    setError('');
    try {
      await boards.update(boardId, { style: next }, token);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? 'Close the running sprint before switching to kanban.' : 'Couldn’t change the board style. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Style</span>
      <ToggleGroup size="sm" variant="outline" aria-label="Board style" disabled={busy} value={[style]}
        onValueChange={(v) => { if (v[0] && v[0] !== style) void change(v[0] as BoardStyle); }}>
        <ToggleGroupItem value="sprints">Sprints</ToggleGroupItem>
        <ToggleGroupItem value="kanban">Kanban</ToggleGroupItem>
      </ToggleGroup>
      {error && <span role="alert" className="text-destructive">{error}</span>}
    </div>
  );
}
