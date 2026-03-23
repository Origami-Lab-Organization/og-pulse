import { Target, TrendingUp, CheckCircle, AlertTriangle, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';

interface OkrKPIsProps {
  activeOkrs: number;
  avgProgress: number;
  onTrack: number;
  atRisk: number;
  completed: number;
}

export function OkrKPIs({ activeOkrs, avgProgress, onTrack, atRisk, completed }: OkrKPIsProps) {
  return (
    <div className="grid gap-4 grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">OKRs Ativos</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeOkrs}</div>
          <p className="mt-1 text-xs text-muted-foreground">em andamento</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Progresso Médio</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(avgProgress)}</div>
          <p className="mt-1 text-xs text-muted-foreground">dos OKRs ativos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">No Prazo</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{onTrack}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeOkrs > 0 ? `${formatPercent((onTrack / activeOkrs) * 100)} dos ativos` : '—'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Em Risco</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{atRisk}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeOkrs > 0 ? `${formatPercent((atRisk / activeOkrs) * 100)} dos ativos` : '—'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completed}</div>
          <p className="mt-1 text-xs text-muted-foreground">no período</p>
        </CardContent>
      </Card>
    </div>
  );
}
