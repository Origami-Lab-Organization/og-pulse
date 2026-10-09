import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDay } from '@/lib/prospecting/periods';
import { getProspectStageColor, getProspectStageLabel, type ProspectWithCompany } from '@/types/prospect';
import type { Occurrence } from '@/types/prospectMetrics';

interface MetricDrillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items: Occurrence[];
  onOpenProspect: (prospect: ProspectWithCompany) => void;
}

/** O número vira nomes: quem foi contado, quando, e em que etapa está hoje. */
export function MetricDrillDialog(props: MetricDrillDialogProps) {
  const { open, onOpenChange, title, description, items, onOpenProspect } = props;
  const abrir = (prospect: ProspectWithCompany) => {
    onOpenChange(false);
    onOpenProspect(prospect);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada no período.</p>
        ) : (
          <ul className="max-h-[60vh] divide-y overflow-y-auto rounded-lg border">
            {items.map((item, i) => (
              <li key={`${item.prospect?.id ?? item.company?.id ?? i}-${item.date}`}>
                <Linha item={item} onSelect={abrir} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface LinhaProps {
  item: Occurrence;
  /** Escolher a linha: quem decide fechar o diálogo e abrir o contato é o pai. */
  onSelect: (prospect: ProspectWithCompany) => void;
}

function Linha(props: LinhaProps) {
  const { item, onSelect } = props;
  const conteudo = (
    <>
      <span className="w-20 shrink-0 tabular-nums text-muted-foreground">{formatDay(item.date).slice(0, 5)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.prospect?.company?.name ?? item.company?.name ?? '—'}</span>
        {item.prospect?.contact_name && (
          <span className="block truncate text-xs text-muted-foreground">{item.prospect.contact_name}</span>
        )}
      </span>
      {item.prospect && (
        <Badge variant="outline" className={getProspectStageColor(item.prospect.stage)}>
          {getProspectStageLabel(item.prospect.stage)}
        </Badge>
      )}
    </>
  );
  if (!item.prospect) return <div className="flex items-center gap-3 px-3 py-2 text-sm">{conteudo}</div>;
  const prospect = item.prospect;
  return (
    <button
      type="button"
      onClick={() => onSelect(prospect)}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
    >
      {conteudo}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
