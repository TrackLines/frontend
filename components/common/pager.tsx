'use client';

import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { pageItems } from '@/lib/site/pagination';

// Pager: the shadcn pagination for a list; nothing when everything fits on one page.
// anchor is where the links point (#id of the list), so they still work without JS.
export function Pager({ page, lastPage, onPage, anchor, className = 'mt-4' }: {
  page: number; lastPage: number; onPage: (page: number) => void; anchor: string; className?: string;
}) {
  if (lastPage <= 1) return null;
  const go = (p: number) => (e: { preventDefault(): void }) => { e.preventDefault(); if (p >= 1 && p <= lastPage && p !== page) onPage(p); };
  const off = (disabled: boolean) => (disabled ? 'pointer-events-none opacity-50' : undefined);
  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href={anchor} aria-disabled={page === 1} className={off(page === 1)} onClick={go(page - 1)} />
        </PaginationItem>
        {pageItems(page, lastPage).map((p, i) => (
          <PaginationItem key={p === 'gap' ? `gap${i}` : p}>
            {p === 'gap' ? <PaginationEllipsis /> : <PaginationLink href={anchor} isActive={p === page} onClick={go(p)}>{p}</PaginationLink>}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href={anchor} aria-disabled={page === lastPage} className={off(page === lastPage)} onClick={go(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
