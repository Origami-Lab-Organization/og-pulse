import { Users, ThumbsUp, Minus, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';

interface StakeholderKPIsProps {
  total: number;
  promoters: number;
  neutrals: number;
  detractors: number;
}

export function StakeholderKPIs({ total, promoters, neutrals, detractors }: StakeholderKPIsProps) {
  const pct = (n: number) => (total > 0 ? formatPercent((n / total) * 100) : '—');

  return (
    <div className="grid gap-4 grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Stakeholders
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="mt-1 text-xs text-muted-foreground">mapeados nos projetos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Promotores</CardTitle>
          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{promoters}</div>
          <p className="mt-1 text-xs text-muted-foreground">{pct(promoters)} do total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Neutros</CardTitle>
          <Minus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{neutrals}</div>
          <p className="mt-1 text-xs text-muted-foreground">{pct(neutrals)} do total</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Detratores</CardTitle>
          <ThumbsDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{detractors}</div>
          <p className="mt-1 text-xs text-muted-foreground">{pct(detractors)} do total</p>
        </CardContent>
      </Card>
    </div>
  );
}
