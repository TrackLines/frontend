'use client';

import { useParams } from 'next/navigation';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { FlowReport } from '@/components/sprint/flow-report';
import { LoadError } from '@/components/layout/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, boards, type Board, type BoardFlow } from '@/lib/api';
import { useToken } from '@/lib/hooks/use-token';

// /boards/<id>/flow: a Kanban board's flow report (TL-622): its charts on one page, to save as a PDF
// (the browser's print) or as Markdown (the server's, TL-621).
export default function FlowReportPage() {
  const { t } = useLingui();
  const { id } = useParams<{ id: string }>();
  const token = useToken();
  const [board, setBoard] = useState<Board | null>(null);
  const [flow, setFlow] = useState<BoardFlow | null>(null);
  const [error, setError] = useState<number | null>(null);
  useEffect(() => {
    if (!token) return;
    const failed = (e: unknown) => setError(e instanceof ApiError ? e.status : 500);
    boards.get(id, token).then(setBoard, failed);
    boards.flow(id, token).then(setFlow, failed);
  }, [id, token !== null]); // token refreshes must not refetch

  if (error) return <LoadError status={error} thing="board" />;
  if (!board || !flow || !token) return <main className="mx-auto max-w-6xl px-6 py-10"><Skeleton role="status" aria-label={t`Loading report…`} className="h-96 w-full" /></main>;
  return <FlowReport board={board} flow={flow} token={token} />;
}
