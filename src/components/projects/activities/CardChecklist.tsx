// ACT-06 — DoR / DoD checklists
import { ClipboardList } from 'lucide-react';

interface CardChecklistProps {
  cardId: string;
  disabled?: boolean;
}

export function CardChecklist({ cardId: _cardId, disabled: _disabled }: CardChecklistProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
      <ClipboardList className="h-5 w-5 opacity-40" />
      <span className="text-xs">Checklists DoR / DoD — em breve</span>
    </div>
  );
}
