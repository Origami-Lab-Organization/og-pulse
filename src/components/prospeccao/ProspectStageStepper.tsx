import {
  PROSPECT_FUNNEL_STAGES,
  PROSPECT_STAGE_META,
  type ProspectStage,
} from '@/types/prospect';
import { cn } from '@/lib/utils';

interface ProspectStageStepperProps {
  stage: ProspectStage;
  className?: string;
}

const ETAPA_GANHO: ProspectStage = 'ganho';

/**
 * Até onde a barra vai. Ganho preenche o caminho todo: quem vendeu passou por todas as
 * etapas (a mesma regra dos marcos, em `milestones.ts`). Perda e as etapas antigas não
 * preenchem nada: a ficha não sabe de onde a oportunidade saiu, e pintar o trajeto seria
 * inventar progresso.
 */
function alcance(stage: ProspectStage): number {
  if (stage === ETAPA_GANHO) return PROSPECT_FUNNEL_STAGES.length - 1;
  return PROSPECT_FUNNEL_STAGES.indexOf(stage);
}

/**
 * Régua das seis etapas de trabalho, no topo da ficha da oportunidade (09/10/2026: os dois
 * desfechos saíram da régua e viraram os botões "Marcar perda" e "Marcar ganho" ao lado dela;
 * o badge do cabeçalho diz quando a oportunidade já terminou).
 *
 * Responde "onde estou" antes de qualquer leitura: a barra preenchida é o caminho percorrido,
 * e só a etapa atual leva rótulo em destaque.
 */
export function ProspectStageStepper({ stage, className }: ProspectStageStepperProps) {
  const ate = alcance(stage);

  return (
    <ol
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${PROSPECT_FUNNEL_STAGES.length}, minmax(0, 1fr))` }}
      aria-label="Etapa da oportunidade"
    >
      {PROSPECT_FUNNEL_STAGES.map((etapa, indice) => {
        const ehAtual = etapa === stage;
        const rotulo = PROSPECT_STAGE_META[etapa].label;
        return (
          <li key={etapa} className="min-w-0 space-y-2" aria-current={ehAtual ? 'step' : undefined}>
            <div
              className={cn('h-1 rounded-full', indice <= ate ? 'bg-primary' : 'bg-border')}
              aria-hidden="true"
            />
            <span
              title={rotulo}
              className={cn(
                'block text-xs leading-tight',
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
