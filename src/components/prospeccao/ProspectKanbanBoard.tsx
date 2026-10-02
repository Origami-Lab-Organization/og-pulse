import { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
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
import { usePendingProspectTasks } from '@/hooks/useProspectTasks';
import { useUpdateProspectStage } from '@/hooks/useProspects';
import {
  advanceModeFor,
  canWin,
  isBackwardMove,
  isOutcomeStage,
  outcomeDateOf,
  PROSPECT_BOARD_STAGES,
  PROSPECT_MANUAL_STAGES,
  PROSPECT_STAGE_META,
  getProspectStageLabel,
  toISODate,
  type ProspectAdvanceMode,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import { DiscardProspectDialog } from './DiscardProspectDialog';
import { ProspectKanbanCard } from './ProspectKanbanCard';
import { ProspectKanbanColumn } from './ProspectKanbanColumn';
import { ProspectWonDialog } from './ProspectWonDialog';
import { RegisterMeetingDialog } from './RegisterMeetingDialog';

/**
 * Ganho e Perda mostram só os desfechos recentes, como fazem os grandes sistemas comerciais
 * (HubSpot, Pipedrive): o quadro é de trabalho em aberto, e uma coluna que só cresce empurra
 * para fora da tela o que ainda pede ação. O resto está a um clique, na própria coluna, e
 * inteiro na aba Métricas.
 */
const DIAS_NO_QUADRO = 30;

type Dialogo = 'reuniao' | 'ganho' | 'perda';

/** O que soltar numa coluna abre antes de mover. Ausente = move direto. */
const DIALOGO_DO_MODO: Partial<Record<ProspectAdvanceMode, Dialogo>> = {
  prompt: 'reuniao',
  win: 'ganho',
  loss: 'perda',
};

interface ProspectKanbanBoardProps {
  prospects: ProspectWithCompany[];
  /** Empresa → contatos dela em conversa ou além (ver `contactsInConversationByCompany`). */
  emConversaPorEmpresa: Map<string, ProspectWithCompany[]>;
  onOpen: (prospect: ProspectWithCompany) => void;
  agruparPorEmpresa?: boolean;
}

export function ProspectKanbanBoard({ prospects, emConversaPorEmpresa, onOpen, agruparPorEmpresa }: ProspectKanbanBoardProps) {
  const atualizarEtapa = useUpdateProspectStage();
  const { porContato: proximaTarefa } = usePendingProspectTasks();
  const [arrastando, setArrastando] = useState<ProspectWithCompany | null>(null);
  const [dialogo, setDialogo] = useState<{ tipo: Dialogo; prospect: ProspectWithCompany } | null>(null);
  const [expandidas, setExpandidas] = useState<Set<ProspectStage>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const porEtapa = useMemo(() => agruparPorEtapa(prospects), [prospects]);
  const recentesDesde = toISODate(subDays(new Date(), DIAS_NO_QUADRO));

  const alternar = (stage: ProspectStage) =>
    setExpandidas((atual) => {
      const nova = new Set(atual);
      if (nova.has(stage)) nova.delete(stage);
      else nova.add(stage);
      return nova;
    });

  const fecharDialogo = (aberto: boolean) => !aberto && setDialogo(null);
  const abertoPara = (tipo: Dialogo) => (dialogo?.tipo === tipo ? dialogo.prospect : null);

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

    // Voltar é correção: move direto, sem as regras nem os registros de chegada da etapa.
    if (isBackwardMove(prospect.stage, destino)) {
      atualizarEtapa.mutate({ id: prospect.id, stage: destino });
      return;
    }

    const recusa = motivoDeRecusa(destino, prospect);
    if (recusa) {
      toast({ title: 'Movimento não permitido', description: recusa, variant: 'destructive' });
      return;
    }

    // Reunião feita, Ganho e Perda não movem em silêncio: abrem o registro do que aconteceu
    // (a reunião, a venda, o motivo), que é a informação que some se não for capturada na hora.
    const tipo = DIALOGO_DO_MODO[advanceModeFor(destino)];
    if (tipo) {
      setDialogo({ tipo, prospect });
      return;
    }

    atualizarEtapa.mutate({ id: prospect.id, stage: destino });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Colunas derivadas das etapas: acrescentar uma etapa não pode exigir lembrar deste grid.
          A altura vem do espaço que sobra na página (AppLayout `fillViewport`), não de uma
          conta com o viewport. Sem piso de altura: em janela baixa as colunas encolhem e rolam
          por dentro — um piso empurrava a página e ela voltava a rolar na vertical. */}
      <div
        className="grid min-h-0 flex-1 grid-rows-1 gap-3 overflow-x-auto overflow-y-hidden"
        style={{ gridTemplateColumns: `repeat(${PROSPECT_BOARD_STAGES.length}, minmax(210px, 1fr))` }}
      >
        {PROSPECT_BOARD_STAGES.map((stage) => {
          const todos = porEtapa.get(stage) ?? [];
          const recorte = isOutcomeStage(stage)
            ? { total: todos.length, expandida: expandidas.has(stage), onToggle: () => alternar(stage), dias: DIAS_NO_QUADRO }
            : undefined;
          const visiveis = recorte && !recorte.expandida ? todos.filter((p) => (outcomeDateOf(p) ?? '') >= recentesDesde) : todos;
          return (
            <ProspectKanbanColumn
              key={stage}
              stage={stage}
              label={PROSPECT_STAGE_META[stage].label}
              prospects={visiveis}
              recorte={recorte}
              emConversaPorEmpresa={emConversaPorEmpresa}
              proximaTarefaPorContato={proximaTarefa}
              onOpen={onOpen}
              agruparPorEmpresa={agruparPorEmpresa}
            />
          );
        })}
      </div>

      <RegisterMeetingDialog prospect={abertoPara('reuniao')} open={!!abertoPara('reuniao')} onOpenChange={fecharDialogo} />
      <ProspectWonDialog prospect={abertoPara('ganho')} open={!!abertoPara('ganho')} onOpenChange={fecharDialogo} />
      <DiscardProspectDialog prospect={abertoPara('perda')} open={!!abertoPara('perda')} onOpenChange={fecharDialogo} />

      <DragOverlay>
        {arrastando && (
          <ProspectKanbanCard
            prospect={arrastando}
            currentStage={arrastando.stage}
            emConversa={emConversaPorEmpresa.get(arrastando.company_id)}
            onOpen={() => undefined}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** Desfechos do mais recente para o mais antigo; o resto na ordem em que chegou. */
function agruparPorEtapa(prospects: ProspectWithCompany[]): Map<ProspectStage, ProspectWithCompany[]> {
  const mapa = new Map<ProspectStage, ProspectWithCompany[]>();
  PROSPECT_BOARD_STAGES.forEach((stage) => mapa.set(stage, []));
  prospects.forEach((p) => mapa.get(p.stage)?.push(p));
  for (const stage of PROSPECT_BOARD_STAGES.filter(isOutcomeStage)) {
    mapa.get(stage)?.sort((a, b) => (outcomeDateOf(b) ?? '').localeCompare(outcomeDateOf(a) ?? ''));
  }
  return mapa;
}

function resolverDestino(overId: string | number, overData?: Record<string, unknown>): ProspectStage | null {
  const doDado = overData?.stage as ProspectStage | undefined;
  if (doDado) return doDado;
  const doCard = (overData?.currentStage as ProspectStage | undefined) ?? null;
  if (doCard) return doCard;
  const id = String(overId) as ProspectStage;
  return PROSPECT_BOARD_STAGES.includes(id) ? id : null;
}

/**
 * A regra dura do módulo: o card só avança por evento verificável.
 *
 * "Em cadência" é decidida pela cadência no banco, e "Respondeu" exige uma atividade com
 * resposta registrada. Permitir o arraste para as duas transformaria o
 * board em ficção: alguém arrastaria porque "abriu o e-mail" ou "aceitou a conexão", e a
 * taxa de resposta — a métrica que paga a conta — passaria a medir otimismo.
 */
function motivoDeRecusa(destino: ProspectStage, prospect: ProspectWithCompany): string | null {
  if (PROSPECT_MANUAL_STAGES.includes(destino)) return null;
  const regra = REGRAS_DE_DESTINO[destino];
  if (regra) return regra(prospect);
  return `${getProspectStageLabel(destino)} é decidida pela cadência, não pelo arraste.`;
}

/** Destinos com regra própria. `null` = pode soltar. */
const REGRAS_DE_DESTINO: Partial<Record<ProspectStage, (p: ProspectWithCompany) => string | null>> = {
  respondeu: () =>
    'Respondeu entra pelo registro de atividade com resposta, não pelo arraste. Use o botão "Respondeu".',
  // Mesma regra do banco (prospects_outcome_rules): checar aqui só poupa o diálogo inútil.
  ganho: (p) => (canWin(p) ? null : 'Ganho só a partir de Reunião feita ou Oportunidade qualificada.'),
  descartado: () => null,
};
