import {
  PROSPECT_BOARD_STAGES,
  PROSPECT_STAGE_META,
  type ProspectStage,
} from '@/types/prospect';
import { cn } from '@/lib/utils';

interface ProspectStageStepperProps {
  stage: ProspectStage;
}

const ETAPA_GANHO: ProspectStage = 'ganho';
const ETAPA_PERDA: ProspectStage = 'descartado';

/**
 * Até onde a barra vai. Ganho preenche o caminho todo: quem vendeu passou por todas as
 * etapas (a mesma regra dos marcos, em `milestones.ts`). Perda não preenche caminho nenhum:
 * a ficha não sabe de onde o contato saiu, e pintar o trajeto seria inventar progresso.
 */
function alcance(stage: ProspectStage): number {
  if (stage === ETAPA_PERDA) return -1;
  return PROSPECT_BOARD_STAGES.indexOf(stage);
}

function corDoSegmento(etapa: ProspectStage, stage: ProspectStage, preenchida: boolean): string {
  if (etapa === ETAPA_PERDA) return stage === ETAPA_PERDA ? 'bg-destructive' : 'bg-muted';
  if (etapa === ETAPA_GANHO) return stage === ETAPA_GANHO ? 'bg-success' : 'bg-muted';
  return preenchida ? 'bg-primary' : 'bg-muted';
}

/**
 * Régua das colunas do quadro de Prospecção, no topo da ficha do contato: as seis etapas de
 * trabalho e os dois desfechos, Ganho e Perda (28/09/2026) — a mesma lista e a mesma ordem
 * do Kanban (`PROSPECT_BOARD_STAGES`), para a ficha e o quadro nunca discordarem.
 *
 * Responde "onde estou" antes de qualquer leitura: a barra preenchida é o caminho
 * percorrido, e só a etapa atual leva rótulo em destaque.
 *
 * Não é renderizada nas etapas antigas (sem resposta, convertido): elas não são coluna do
 * quadro, e o badge do cabeçalho já diz o que aconteceu.
 */
export function ProspectStageStepper({ stage }: ProspectStageStepperProps) {
  if (!PROSPECT_BOARD_STAGES.includes(stage)) return null;
  const ate = alcance(stage);

  return (
    <ol
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${PROSPECT_BOARD_STAGES.length}, minmax(0, 1fr))` }}
      aria-label="Etapa no quadro de Prospecção"
    >
      {PROSPECT_BOARD_STAGES.map((etapa, indice) => {
        const ehAtual = etapa === stage;
        const rotulo = PROSPECT_STAGE_META[etapa].label;
        return (
          <li key={etapa} className="space-y-1.5" aria-current={ehAtual ? 'step' : undefined}>
            <div
              className={cn('h-1 rounded-full', corDoSegmento(etapa, stage, indice <= ate))}
              aria-hidden="true"
            />
            <span
              title={rotulo}
              className={cn(
                'block truncate text-xs',
                ehAtual ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {rotulo}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
