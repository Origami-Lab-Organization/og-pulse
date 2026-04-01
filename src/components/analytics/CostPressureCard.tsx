import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  commissionCost: number;
  reimbursementCost: number;
}

export function CostPressureCard({ laborCost, supplierCost, materialCost, commissionCost, reimbursementCost }: Props) {
  const structural = laborCost;
  const thirdParty = supplierCost;
  const variable = materialCost + commissionCost + reimbursementCost;
  const total = structural + thirdParty + variable;
  const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;

  const items = [
    { label: 'Estruturais', subtitle: 'Mão de obra', value: structural, pct: pct(structural), color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Terceiros', subtitle: 'Fornecedores', value: thirdParty, pct: pct(thirdParty), color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Variáveis / Extraordinários', subtitle: 'Materiais, comissões, reembolsos', value: variable, pct: pct(variable), color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leitura de Pressão de Custos</CardTitle>
        <CardDescription className="text-xs">Estrutura fixa vs. variável para otimização</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 flex-1">
        {items.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground ml-2">({item.subtitle})</span>
              </div>
              <span className={cn('text-sm font-semibold tabular-nums', item.textColor)}>
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', item.color)}
                style={{ width: `${Math.min(item.pct, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{formatPercent(item.pct)} do total</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
