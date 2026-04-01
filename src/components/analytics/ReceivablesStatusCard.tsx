import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  received: number;
  pendingOnTime: number;
  overdue: number;
}

export function ReceivablesStatusCard({ received, pendingOnTime, overdue }: Props) {
  const total = received + pendingOnTime + overdue;
  const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;

  const items = [
    { label: 'Recebidas', value: received, pct: pct(received), color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Pendentes no prazo', value: pendingOnTime, pct: pct(pendingOnTime), color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Atrasadas', value: overdue, pct: pct(overdue), color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status da Carteira</CardTitle>
        <CardDescription className="text-xs">Visão de risco de caixa</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 flex-1">
        {items.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.label}</span>
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
