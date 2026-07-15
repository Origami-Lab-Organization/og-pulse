import { forwardRef } from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { laborDeltaTextTone } from '@/lib/laborDeltaTone';
import { useProjectLaborBreakdown } from '@/hooks/useProjectLaborBreakdown';
import { ProjectWithRelations } from '@/types/project';
import { LaborCostTableFull } from './LaborCostTableFull';

interface LaborCostSectionProps {
  project: ProjectWithRelations;
  highlighted?: boolean;
}

function Subtotal({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-right">
      <p className="ol-label text-muted-foreground">{label}</p>
      <p className={cn('font-mono text-base font-semibold tabular-nums', tone ?? 'text-foreground')}>{value}</p>
    </div>
  );
}

/**
 * Seção "Mão de Obra" da aba Custos — breakdown de custo por pessoa para
 * admin/GP. Contém R$ por pessoa; a montagem desta seção já é gated no
 * ProjectCostsTab a `admin || manager_id do projeto` (Nota² do PRD).
 */
export const LaborCostSection = forwardRef<HTMLDivElement, LaborCostSectionProps>(function LaborCostSection(
  { project, highlighted = false },
  ref,
) {
  const formatCurrency = useMaskedCurrency();
  const { rows, totals, isLoading } = useProjectLaborBreakdown(project);

  const deltaTone = laborDeltaTextTone(totals.realizedCost, totals.plannedCost);
  const deltaSign = totals.deltaCost > 0 ? '+' : '';

  return (
    <Card
      ref={ref}
      className={cn(
        'scroll-mt-24 transition-shadow',
        highlighted && 'ring-2 ring-primary-deep/50',
      )}
    >
      <CardHeader className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-deep/10">
            <Users className="h-4 w-4 text-primary-deep" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Mão de Obra</h3>
              {!isLoading && (
                <Badge variant="secondary" className="text-[10px]">
                  {totals.peopleCount} pessoa{totals.peopleCount === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Custo derivado da alocação da equipe e do timesheet</p>
          </div>
        </div>

        {!isLoading && (
          <div className="flex items-start gap-6">
            <Subtotal label="Planejado" value={formatCurrency(totals.plannedCost)} />
            <Subtotal label="Realizado" value={formatCurrency(totals.realizedCost)} />
            <Subtotal
              label="Desvio"
              tone={deltaTone}
              value={`${deltaSign}${formatCurrency(totals.deltaCost)}${totals.deltaPct === null ? '' : ` · ${totals.deltaPct >= 0 ? '+' : ''}${totals.deltaPct.toFixed(0)}%`}`}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma alocação de equipe com custo neste projeto.
          </p>
        ) : (
          <LaborCostTableFull rows={rows} projectStartDate={project.start_date} projectEndDate={project.end_date} />
        )}
      </CardContent>
    </Card>
  );
});
