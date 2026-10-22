import { mock } from 'bun:test';
import type { ReactNode } from 'react';

// mockDialog swaps the portal-based dialog for plain markup, so renderToStaticMarkup can show what an
// open dialog contains (a closed one renders nothing). Call it before importing the component.
export function mockDialog() {
  const pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  mock.module('@/components/ui/dialog', () => ({
    Dialog: ({ open, children }: { open?: boolean; children?: ReactNode }) => (open ? <div role="dialog">{children}</div> : null),
    DialogContent: ({ className, children }: { className?: string; children?: ReactNode }) => <div className={className}>{children}</div>,
    DialogHeader: pass, DialogFooter: pass, DialogDescription: pass, DialogClose: pass, DialogTrigger: pass, DialogPortal: pass,
    DialogOverlay: () => null,
    // bun's module mock is process-wide: every export of the real dialog must be here, or any later file
    // importing a missing one fails depending on test order (TL-516 broke CI that way)
    DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  }));
}
