import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useProjectCostSummary } from '@/hooks/useProjectCostSummary';
import { FinanceInstallmentsTable } from './financial/FinanceInstallmentsTable';

interface ProjectExpectedResultTabProps {
  project: ProjectWithRelations;
  canManageInstallments?: boolean;
}

export function ProjectExpectedResultTab({ project, canManageInstallments = false }: ProjectExpectedResultTabProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();
  // A meta e os percentuais que julgam ESTE projeto são os que valiam quando ele começou
  // (PUL-260). Mudar a política em setembro não muda o que um projeto de janeiro assinou.
  const { data: financialSettings } = useFinancialSettings(project.start_date);
  // Custo planejado: regra única do custo do projeto (US-0025) — mão de obra e todas as
  // categorias do ledger, o mesmo número da Visão Geral e da aba Despesas.
  const { totalPlanned: totalCost } = useProjectCostSummary(project);

  const totalValue = project.total_value;
  const grossMargin = totalValue - totalCost;
  const marginPercent = totalValue > 0 ? (grossMargin / totalValue) * 100 : 0;
  const isPositiveMargin = grossMargin >= 0;

  // Margin target gap
  const marginTarget = financialSettings?.gross_margin_target_percent || 0;
  const marginGap = marginPercent - marginTarget;




  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Resultado Financeiro Esperado</h3>
        <p className="text-sm text-muted-foreground">
          Projeção de receita, custos e margem do projeto
        </p>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4" />
              Custo Planejado
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              Margem Bruta
            </div>
            <p className={`text-2xl font-bold ${isPositiveMargin ? 'text-green-600' : 'text-destructive'}`}>
              {formatCurrency(grossMargin)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              Margem %
            </div>
            <p className={`text-2xl font-bold ${isPositiveMargin ? 'text-green-600' : 'text-destructive'}`}>
              {hideValues ? '•••' : `${marginPercent.toFixed(1)}%`}
            </p>
            {marginTarget > 0 && (
              <p className={`text-xs mt-1 ${marginGap >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {hideValues
                  ? '••• pp vs meta'
                  : `${marginGap >= 0 ? '+' : ''}${marginGap.toFixed(1)}pp vs meta (${marginTarget}%)`}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parcelas / Faturamento — mesma seção da aba Financeiro; na fase
          Planejamento o assistente de geração automática fica disponível. */}
      <FinanceInstallmentsTable project={project} canManage={canManageInstallments} />
    </div>
  );
}
