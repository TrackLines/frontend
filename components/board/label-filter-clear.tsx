import { useLingui } from '@lingui/react/macro';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LabelFilterClear({ onClick }: { onClick: () => void }) {
  const { t } = useLingui();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-5 -ml-1 rounded-full p-0"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={t`Clear label filter`}
    >
      <XIcon className="size-3" aria-hidden />
    </Button>
  );
}
