import { EquipeTab } from '@/components/projects/detail/EquipeTab';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { teamHoursInPeriod, teamPeopleInPeriod } from '@/lib/projectPlanning';
import type { ProjectWithRelations } from '@/types/project';
import type { PlanningComparison, PlanningCounts } from '@/types/projectPlanning';
import { PlanningIntro } from './PlanningPanelParts';

interface PlanningTeamPanelProps {
  project: ProjectWithRelations;
  canEdit: boolean;
  counts: PlanningCounts;
  comparison: PlanningComparison;
}

function Stat(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 px-5 py-3">
      <p className="ol-label text-muted-foreground">{props.label}</p>
      <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{props.value}</p>
      {props.hint && <p className="text-xs text-muted-foreground">{props.hint}</p>}
    </div>
  );
}

/**
 * Aba Equipe do planejamento (US-0039, cenário 6): a grade mensal de hoje, com o resumo da
 * equipe em cima. Só o custo total da equipe — nunca o custo hora de cada pessoa.
 */
export function PlanningTeamPanel(props: PlanningTeamPanelProps) {
  const { project, canEdit, counts, comparison } = props;
  const money = useMaskedCurrency();
  const people = teamPeopleInPeriod(counts);
  const hours = Math.round(teamHoursInPeriod(counts)).toLocaleString('pt-BR');
  const budgeted = comparison.budgeted;
  return (
    <div className="grid gap-4">
      <PlanningIntro title="Quem trabalha e quanto.">
        Aloque as pessoas e as horas mês a mês. O custo da equipe é calculado com o custo de cada uma e entra no resultado
        planejado ao lado.
      </PlanningIntro>
      <section aria-label="Resumo da equipe" className="grid grid-cols-2 divide-x overflow-hidden rounded-lg border bg-card sm:grid-cols-4">
        <Stat label="Pessoas" value={String(people)} />
        <Stat label="Horas no período" value={`${hours} h`} />
        <Stat label="Custo da equipe" value={money(comparison.planned.labor)} />
        <Stat label="Custo orçado" value={budgeted ? money(budgeted.labor) : '—'} hint={budgeted ? undefined : 'Sem orçamento vinculado'} />
      </section>
      <EquipeTab project={project} isReadOnly={!canEdit} />
    </div>
  );
}
