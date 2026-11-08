/** Downloads the printable calibration mat + card sticker PDF (generated in the browser). */
import React, { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { t } from '@/i18n/id';

interface Props {
  compact?: boolean;
  testId?: string;
  className?: string;
}

export function PrintSheetButton({ compact, testId = 'download-calibration-pdf-button', className }: Props) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { downloadCalibrationPdf } = await import('@/print/calibrationPdf');
      await downloadCalibrationPdf();
      toast.success(t.print.done);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[print] pdf failed', err);
      toast.error(t.print.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      data-testid={testId}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border font-bold transition-[filter,transform] duration-150 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--aether-cyan))]',
        compact
          ? 'min-h-[36px] border-[hsl(var(--aether-cyan)/0.45)] bg-[hsl(var(--aether-cyan)/0.1)] px-3 py-1.5 text-xs text-[hsl(188_90%_82%)] hover:brightness-125'
          : 'min-h-[48px] w-full border-[hsl(var(--aether-cyan)/0.5)] bg-[hsl(var(--aether-cyan)/0.12)] px-4 py-3 text-sm text-[hsl(188_90%_85%)] hover:brightness-125',
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {busy ? t.print.generating : compact ? t.print.shortButton : t.print.button}
    </button>
  );
}
