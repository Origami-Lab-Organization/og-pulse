import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { buildProjectMonths } from '@/lib/projectMonths';
import { laborDeltaTextTone } from '@/lib/laborDeltaTone';
import { LaborMonthCell } from '@/hooks/useProjectLaborBreakdown';

interface LaborCostMonthlyExpansionProps {
  months: LaborMonthCell[];
  projectStartDate: string;
  projectEndDate: string | null;
}

/**
 * Grade mês a mês de custo de MO de uma pessoa (planejado × realizado em R$),
 * reutilizando o eixo de meses do projeto (`buildProjectMonths`).
 */
export function LaborCostMonthlyExpansion({ months, projectStartDate, projectEndDate }: LaborCostMonthlyExpansionProps) {
  const formatCurrency = useMaskedCurrency();
  const projectMonths = buildProjectMonths(projectStartDate, projectEndDate);
  const byKey = new Map(months.map((m) => [`${m.year}-${m.month}`, m]));

  // Garante que meses fora da janela do contrato (ex.: realizado extra) apareçam.
  const extraMonths = months
    .filter((m) => !projectMonths.some((pm) => pm.year === m.year && pm.month === m.month))
    .map((m) => ({ year: m.year, month: m.month, label: format(new Date(m.year, m.month - 1, 1), 'MMM/yy', { locale: ptBR }) }));

  const columns = [
    ...projectMonths.map((pm) => ({ year: pm.year, month: pm.month, label: pm.label })),
    ...extraMonths,
  ];

  return (
    <div className="overflow-x-auto bg-muted/20 px-4 py-3">
      <table className="w-full min-w-[560px] border-collapse text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="w-24 py-1 text-left font-medium" />
            {columns.map((c) => (
              <th key={`${c.year}-${c.month}`} className="px-2 py-1 text-right font-semibold uppercase tracking-normal">
                {c.label.replace('.', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 text-left text-muted-foreground">Planejado</td>
            {columns.map((c) => {
              const cell = byKey.get(`${c.year}-${c.month}`);
              return (
                <td key={`p-${c.year}-${c.month}`} className="px-2 py-1 text-right font-mono tabular-nums text-muted-foreground">
                  {cell && cell.plannedCost > 0 ? formatCurrency(cell.plannedCost) : '—'}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className="py-1 text-left text-muted-foreground">Realizado</td>
            {columns.map((c) => {
              const cell = byKey.get(`${c.year}-${c.month}`);
              const tone = cell ? laborDeltaTextTone(cell.realizedCost, cell.plannedCost) : 'text-muted-foreground';
              return (
                <td key={`r-${c.year}-${c.month}`} className={cn('px-2 py-1 text-right font-mono font-medium tabular-nums', tone)}>
                  {cell && cell.realizedCost > 0 ? formatCurrency(cell.realizedCost) : '—'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
