import { Percent, Receipt, Clock, TrendingUp, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  conversionRate: number;
  avgTicket: number;
  avgSalesCycleDays: number;
  activePipeline: number;
  newLeadsThisMonth: number;
}

const kpis = [
  { key: 'conversionRate', label: 'Taxa de Conversão', icon: Percent, format: (v: number) => `${v.toFixed(1)}%` },
  { key: 'avgTicket', label: 'Ticket Médio', icon: Receipt, format: (v: number) => formatCurrency(v) },
  { key: 'avgSalesCycleDays', label: 'Ciclo Médio de Venda', icon: Clock, format: (v: number) => `${Math.round(v)} dias` },
  { key: 'activePipeline', label: 'Pipeline Ativo', icon: TrendingUp, format: (v: number) => formatCurrency(v) },
  { key: 'newLeadsThisMonth', label: 'Leads Novos no Mês', icon: UserPlus, format: (v: number) => String(v) },
] as const;

export function CommercialKPIs(props: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map(kpi => {
        const Icon = kpi.icon;
        const value = props[kpi.key];
        return (
          <Card key={kpi.key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] leading-tight text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold text-foreground">{kpi.format(value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
