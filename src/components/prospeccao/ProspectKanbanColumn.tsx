import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Building2, ChevronDown } from 'lucide-react';
import { groupByCompany } from '@/lib/prospecting/groupByCompany';
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
  /** Agrupa os cards pela empresa, com cabeçalho recolhível (29/09/2026). */
  agruparPorEmpresa?: boolean;
}

export function ProspectKanbanColumn(props: ProspectKanbanColumnProps) {
  const { stage, label, prospects, recorte, agruparPorEmpresa } = props;
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
        {agruparPorEmpresa ? <CardsPorEmpresa {...props} /> : <Cards {...props} lista={prospects} />}
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

function Cards(props: ProspectKanbanColumnProps & { lista: ProspectWithCompany[] }) {
  const { lista, stage, emConversaPorEmpresa, proximaTarefaPorContato, onOpen } = props;
  return (
    <>
      {lista.map((prospect) => (
        <ProspectKanbanCard
          key={prospect.id}
          prospect={prospect}
          currentStage={stage}
          emConversa={emConversaPorEmpresa.get(prospect.company_id)}
          proximaTarefa={proximaTarefaPorContato.get(prospect.id)}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}

/** Um grupo por empresa: o cabeçalho diz quantos contatos dela estão nesta etapa. */
function CardsPorEmpresa(props: ProspectKanbanColumnProps) {
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const alternar = (id: string) =>
    setRecolhidas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });

  return (
    <>
      {groupByCompany(props.prospects).map((grupo) => {
        const recolhida = recolhidas.has(grupo.companyId);
        return (
          <section key={grupo.companyId} aria-label={grupo.nome} className="space-y-1.5">
            <button
              type="button"
              onClick={() => alternar(grupo.companyId)}
              aria-expanded={!recolhida}
              className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', recolhida && '-rotate-90')} aria-hidden="true" />
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{grupo.nome}</span>
              <span className="ml-auto shrink-0">{grupo.contatos.length}</span>
            </button>
            {!recolhida && <Cards {...props} lista={grupo.contatos} />}
          </section>
        );
      })}
    </>
  );
}
