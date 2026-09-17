import {
  PROSPECT_FUNNEL_STAGES,
  PROSPECT_STAGE_META,
  type ProspectStage,
} from '@/types/prospect';
import { cn } from '@/lib/utils';

interface ProspectStageStepperProps {
  stage: ProspectStage;
}

/**
 * Régua das cinco etapas do funil, no topo do card.
 *
 * Responde "onde estou" antes de qualquer leitura: a barra preenchida é o caminho
 * percorrido, e só a etapa atual leva rótulo em destaque.
 *
 * Não é renderizada nos desfechos (sem resposta, descartado, convertido): eles não são
 * posição no funil, e desenhá-los como progresso mentiria sobre o estado do contato —
 * o badge do cabeçalho já diz o que aconteceu.
 */
export function ProspectStageStepper({ stage }: ProspectStageStepperProps) {
  const atual = PROSPECT_FUNNEL_STAGES.indexOf(stage);
  if (atual < 0) return null;

  return (
    <ol
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${PROSPECT_FUNNEL_STAGES.length}, minmax(0, 1fr))` }}
      aria-label="Etapa do funil de prospecção"
    >
      {PROSPECT_FUNNEL_STAGES.map((etapa, indice) => {
        const percorrida = indice <= atual;
        const ehAtual = indice === atual;
        return (
          <li key={etapa} className="space-y-1.5">
            <div
              className={cn('h-1 rounded-full', percorrida ? 'bg-primary' : 'bg-muted')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'block truncate text-xs',
                ehAtual ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {PROSPECT_STAGE_META[etapa].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
