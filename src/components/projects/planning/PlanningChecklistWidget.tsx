import { ClipboardCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PlanningChecklist, PlanningItemKey } from '@/types/projectPlanning';

interface PlanningChecklistWidgetProps {
  checklist: PlanningChecklist;
  justDone: PlanningItemKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const RING = 2 * Math.PI * 9;

function ProgressRing({ share }: { share: number }) {
  return (
    <svg viewBox="0 0 22 22" className="h-6 w-6 -rotate-90" aria-hidden>
      <circle cx="11" cy="11" r="9" fill="none" strokeWidth="3" className="stroke-muted" />
      <circle
        cx="11"
        cy="11"
        r="9"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - share)}
        className="stroke-primary transition-all duration-300"
      />
    </svg>
  );
}

function statusText(checklist: PlanningChecklist, justDone: PlanningItemKey | null) {
  const flipped = justDone && checklist.items.find((item) => item.key === justDone);
  if (flipped) return `Pronto · ${flipped.label}`;
  if (checklist.allRequiredDone) return 'Pronto para concluir';
  return `${checklist.requiredDone} de ${checklist.requiredTotal} obrigatórios`;
}

/**
 * Checklist do planejamento como widget (US-0039, ajuste de 24/11/2026): um botão fixo no canto
 * mostra o andamento sem ocupar a tela; ao abrir, traz o checklist, o resultado orçado ×
 * planejado e a conclusão.
 */
export function PlanningChecklistWidget(props: PlanningChecklistWidgetProps) {
  const { checklist, justDone, open, onOpenChange, children } = props;
  const share = checklist.requiredTotal > 0 ? checklist.requiredDone / checklist.requiredTotal : 0;
  const highlight = Boolean(justDone) || checklist.allRequiredDone;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Checklist do planejamento: ${statusText(checklist, justDone)}`}
          className={cn(
            'fixed bottom-20 right-6 z-40 inline-flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5 text-left shadow-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            highlight && 'border-primary',
          )}
        >
          {checklist.allRequiredDone ? <ClipboardCheck className="h-6 w-6 text-primary" aria-hidden /> : <ProgressRing share={share} />}
          <span className="grid leading-tight">
            <span className="text-sm font-semibold text-foreground">Planejamento</span>
            <span className={cn('text-xs text-muted-foreground', highlight && 'font-medium text-success-emphasis')}>
              {statusText(checklist, justDone)}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={10} className="w-[min(680px,calc(100vw-2rem))] p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
}
