import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from '@/hooks/use-toast';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import {
  advanceModeFor,
  PROSPECT_FUNNEL_STAGES,
  PROSPECT_MANUAL_STAGES,
  PROSPECT_STAGE_META,
  getProspectStageLabel,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import { ProspectKanbanCard } from './ProspectKanbanCard';
import { ProspectKanbanColumn } from './ProspectKanbanColumn';
import { RegisterMeetingDialog } from './RegisterMeetingDialog';

interface ProspectKanbanBoardProps {
  prospects: ProspectWithCompany[];
  onOpen: (prospect: ProspectWithCompany) => void;
}

export function ProspectKanbanBoard({ prospects, onOpen }: ProspectKanbanBoardProps) {
  const atualizarEtapa = useUpdateProspectStage();
  const [arrastando, setArrastando] = useState<ProspectWithCompany | null>(null);
  const [reuniaoPara, setReuniaoPara] = useState<ProspectWithCompany | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const porEtapa = useMemo(() => {
    const mapa = new Map<ProspectStage, ProspectWithCompany[]>();
    PROSPECT_FUNNEL_STAGES.forEach((stage) => mapa.set(stage, []));
    prospects.forEach((p) => mapa.get(p.stage)?.push(p));
    return mapa;
  }, [prospects]);

  const handleDragStart = (event: DragStartEvent) => {
    setArrastando((event.active.data.current?.prospect as ProspectWithCompany) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setArrastando(null);
    const { active, over } = event;
    if (!over) return;

    const prospect = active.data.current?.prospect as ProspectWithCompany | undefined;
    const destino = resolverDestino(over.id, over.data.current);
    if (!prospect || !destino || destino === prospect.stage) return;

    const recusa = motivoDeRecusa(destino);
    if (recusa) {
      toast({ title: 'Movimento não permitido', description: recusa, variant: 'destructive' });
      return;
    }

    // Reunião feita não move em silêncio: abre o registro do que aconteceu na conversa,
    // que é a informação que some primeiro se não for capturada na hora.
    if (advanceModeFor(destino) === 'prompt') {
      setReuniaoPara(prospect);
      return;
    }

    atualizarEtapa.mutate({ id: prospect.id, stage: destino });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Colunas derivadas das etapas: acrescentar uma etapa não pode exigir lembrar deste grid. */}
      <div
        className="grid gap-3 h-[calc(100vh-290px)] overflow-x-auto"
        style={{ gridTemplateColumns: `repeat(${PROSPECT_FUNNEL_STAGES.length}, minmax(210px, 1fr))` }}
      >
        {PROSPECT_FUNNEL_STAGES.map((stage) => (
          <ProspectKanbanColumn
            key={stage}
            stage={stage}
            label={PROSPECT_STAGE_META[stage].label}
            prospects={porEtapa.get(stage) ?? []}
            onOpen={onOpen}
          />
        ))}
      </div>

      <RegisterMeetingDialog
        prospect={reuniaoPara}
        open={!!reuniaoPara}
        onOpenChange={(aberto) => !aberto && setReuniaoPara(null)}
      />

      <DragOverlay>
        {arrastando && (
          <ProspectKanbanCard
            prospect={arrastando}
            currentStage={arrastando.stage}
            onOpen={() => undefined}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function resolverDestino(overId: string | number, overData?: Record<string, unknown>): ProspectStage | null {
  const doDado = overData?.stage as ProspectStage | undefined;
  if (doDado) return doDado;
  const doCard = (overData?.currentStage as ProspectStage | undefined) ?? null;
  if (doCard) return doCard;
  const id = String(overId) as ProspectStage;
  return PROSPECT_FUNNEL_STAGES.includes(id) ? id : null;
}

/**
 * A regra dura do módulo: o card só avança por evento verificável.
 *
 * "Em cadência" e "Sem resposta" são decididas pela cadência no banco, e "Respondeu" exige
 * uma atividade com resposta registrada. Permitir o arraste para as três transformaria o
 * board em ficção: alguém arrastaria porque "abriu o e-mail" ou "aceitou a conexão", e a
 * taxa de resposta — a métrica que paga a conta — passaria a medir otimismo.
 */
function motivoDeRecusa(destino: ProspectStage): string | null {
  if (PROSPECT_MANUAL_STAGES.includes(destino)) return null;
  if (destino === 'respondeu') {
    return 'Respondeu entra pelo registro de atividade com resposta, não pelo arraste. Use o botão "Respondeu".';
  }
  return `${getProspectStageLabel(destino)} é decidida pela cadência, não pelo arraste.`;
}
