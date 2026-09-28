import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { PendingTaskLite, ProspectColumnCut, ProspectStage, ProspectWithCompany } from '@/types/prospect';
import { ProspectKanbanCard } from './ProspectKanbanCard';

interface ProspectKanbanColumnProps {
  stage: ProspectStage;
  label: string;
  prospects: ProspectWithCompany[];
  recorte?: ProspectColumnCut;
  emConversaPorEmpresa: Map<string, ProspectWithCompany[]>;
  proximaTarefaPorContato: Map<string, PendingTaskLite>;
  onOpen: (prospect: ProspectWithCompany) => void;
}

export function ProspectKanbanColumn(props: ProspectKanbanColumnProps) {
  const { stage, label, prospects, recorte, emConversaPorEmpresa, proximaTarefaPorContato, onOpen } = props;
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { stage } });

  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{prospects.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto p-2 scrollbar-hide transition-colors',
          isOver && 'bg-accent/50',
        )}
      >
        {prospects.map((prospect) => (
          <ProspectKanbanCard
            key={prospect.id}
            prospect={prospect}
            currentStage={stage}
            emConversa={emConversaPorEmpresa.get(prospect.company_id)}
            proximaTarefa={proximaTarefaPorContato.get(prospect.id)}
            onOpen={onOpen}
          />
        ))}
        {prospects.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            {recorte && recorte.total > 0 ? `Nada nos últimos ${recorte.dias} dias` : 'Vazio'}
          </p>
        )}
      </div>
      {recorte && <RodapeDoRecorte recorte={recorte} mostrando={prospects.length} />}
    </div>
  );
}

function RodapeDoRecorte({ recorte, mostrando }: { recorte: ProspectColumnCut; mostrando: number }) {
  if (recorte.total === 0) return null;
  const escondidos = recorte.total - mostrando;
  if (!recorte.expandida && escondidos === 0) {
    return <p className="border-t px-3 py-2 text-xs text-muted-foreground">Últimos {recorte.dias} dias</p>;
  }
  return (
    <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
      <span>{recorte.expandida ? `Todos (${recorte.total})` : `Últimos ${recorte.dias} dias · ${mostrando} de ${recorte.total}`}</span>
      <button
        type="button"
        onClick={recorte.onToggle}
        className="rounded font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={recorte.expandida}
      >
        {recorte.expandida ? 'Só recentes' : 'Ver todos'}
      </button>
    </div>
  );
}
