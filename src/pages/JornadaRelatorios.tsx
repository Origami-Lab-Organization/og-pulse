import { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  CalendarRange,
  TrendingUp,
  Users,
  Lock,
  LockOpen,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEmployeesJornadaOverview } from '@/hooks/useEmployeesJornadaOverview';
import { useMonthPunches } from '@/hooks/useTimePunches';
import { useMonthSummary } from '@/hooks/useTimeDailySummary';
import { useTimeBankLedger } from '@/hooks/useTimeBankBalance';
import {
  useTimeTrackingPeriodLocks,
  useCloseTimeTrackingPeriod,
  useReopenTimeTrackingPeriod,
} from '@/hooks/useTimeTrackingPeriodLocks';
import { formatHours } from '@/lib/formatters';
import { downloadCsv } from '@/lib/timeTrackingCsvExport';
import { generateEspelhoPontoPdf } from '@/lib/timeTrackingPdfGenerator';
import { cn } from '@/lib/utils';

const PUNCH_TIME_FORMAT = 'HH:mm';

const JornadaRelatorios = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  const periodLabel = format(selectedMonth, 'MMMM yyyy', { locale: ptBR });

  const { data: overview, isLoading } = useEmployeesJornadaOverview(monthStart, monthEnd);
  const [espelhoEmployeeId, setEspelhoEmployeeId] = useState<string | null>(null);

  const ano = selectedMonth.getFullYear();
  const mes = selectedMonth.getMonth() + 1;
  const { data: locks } = useTimeTrackingPeriodLocks();
  const closePeriod = useCloseTimeTrackingPeriod();
  const reopenPeriod = useReopenTimeTrackingPeriod();
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const monthLock = (locks || []).find((l) => l.ano === ano && l.mes === mes);

  const chartData = useMemo(
    () => (overview || [])
      .filter((row) => row.horasExtrasMes > 0)
      .sort((a, b) => b.horasExtrasMes - a.horasExtrasMes)
      .slice(0, 10)
      .map((row) => ({ name: row.nome, value: Number(row.horasExtrasMes.toFixed(2)) })),
    [overview],
  );

  const handleExportCsv = () => {
    downloadCsv(
      `relatorio-jornada-${monthStart}.csv`,
      ['Colaborador', 'Cargo', 'Horas extras (mês)', 'Faltas (mês)', 'Banco de horas'],
      (overview || []).map((row) => [row.nome, row.cargo, row.horasExtrasMes.toFixed(2), row.faltasMes, row.saldoAcumulado.toFixed(2)]),
    );
  };

  return (
    <AppLayout
      title="Ponto Eletrônico — Relatórios"
      description="Indicadores consolidados do tenant, por período"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-3 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarRange className="h-4 w-4" />
              </span>
              Período
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth((d) => addMonths(d, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-28 text-center text-sm font-medium capitalize">{periodLabel}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth((d) => addMonths(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-3 text-base">
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  monthLock ? 'bg-success-subtle text-success-emphasis' : 'bg-primary/10 text-primary',
                )}
              >
                {monthLock ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
              </span>
              Fechamento de {periodLabel}
            </CardTitle>
            {monthLock ? (
              <Button
                variant="outline"
                size="sm"
                disabled={reopenPeriod.isPending}
                onClick={() => reopenPeriod.mutate(monthLock.id)}
              >
                <LockOpen className="mr-2 h-4 w-4" />
                Reabrir mês
              </Button>
            ) : (
              <Button size="sm" disabled={closePeriod.isPending} onClick={() => setConfirmCloseOpen(true)}>
                <Lock className="mr-2 h-4 w-4" />
                Fechar mês
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {monthLock
                ? `Período fechado em ${format(new Date(monthLock.fechado_em), 'dd/MM/yyyy HH:mm')}. Novas marcações e ajustes ficam bloqueados para ${periodLabel}.`
                : `${periodLabel} ainda está aberto — colaboradores podem registrar ponto e solicitar ajustes normalmente.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-warning-subtle text-warning-emphasis">
                <TrendingUp className="h-4 w-4" />
              </span>
              Top horas extras do mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma hora extra registrada neste período.
              </p>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => `${value}h`} cursor={false} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
              Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="text-right">Horas extras</TableHead>
                    <TableHead className="text-right">Faltas</TableHead>
                    <TableHead className="text-right">Banco de horas</TableHead>
                    <TableHead className="text-right">Espelho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview || []).map((row) => (
                    <TableRow key={row.employeeId}>
                      <TableCell className="font-medium">{row.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{row.cargo}</TableCell>
                      <TableCell className="text-right">{formatHours(row.horasExtrasMes)}</TableCell>
                      <TableCell className="text-right">{row.faltasMes}</TableCell>
                      <TableCell className={cn('text-right', row.saldoAcumulado < 0 && 'font-medium text-destructive-emphasis')}>
                        {formatHours(row.saldoAcumulado)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEspelhoEmployeeId(row.employeeId)}>
                          <FileText className="mr-1 h-4 w-4" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {espelhoEmployeeId && (
        <EspelhoPontoGenerator
          employeeId={espelhoEmployeeId}
          employeeName={(overview || []).find((r) => r.employeeId === espelhoEmployeeId)?.nome ?? ''}
          cargo={(overview || []).find((r) => r.employeeId === espelhoEmployeeId)?.cargo ?? ''}
          monthStart={monthStart}
          monthEnd={monthEnd}
          periodLabel={periodLabel}
          onDone={() => setEspelhoEmployeeId(null)}
        />
      )}

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar {periodLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              Depois de fechado, colaboradores não conseguem mais registrar ponto nem solicitar
              ajustes para datas deste mês. Você pode reabrir depois, se precisar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={closePeriod.isPending}
              onClick={() => closePeriod.mutate({ ano, mes }, { onSuccess: () => setConfirmCloseOpen(false) })}
            >
              Fechar período
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

// Componente invisível: carrega os dados de um colaborador específico e dispara o download do PDF assim que prontos.
function EspelhoPontoGenerator({
  employeeId,
  employeeName,
  cargo,
  monthStart,
  monthEnd,
  periodLabel,
  onDone,
}: {
  employeeId: string;
  employeeName: string;
  cargo: string;
  monthStart: string;
  monthEnd: string;
  periodLabel: string;
  onDone: () => void;
}) {
  const { data: punches } = useMonthPunches(employeeId, monthStart, monthEnd);
  const { data: summaries } = useMonthSummary(employeeId, monthStart, monthEnd);
  const { data: ledger } = useTimeBankLedger(employeeId, monthStart, monthEnd);
  const generatedRef = useRef(false);

  useEffect(() => {
    if (generatedRef.current || !punches || !summaries) return;
    generatedRef.current = true;

    const punchesByDate = new Map<string, typeof punches>();
    for (const p of punches) {
      const date = p.horario.split('T')[0];
      punchesByDate.set(date, [...(punchesByDate.get(date) || []), p]);
    }

    const rows = summaries
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((summary) => {
        const dayPunches = punchesByDate.get(summary.data) || [];
        const find = (tipo: string) => dayPunches.find((p) => p.tipo === tipo);
        const fmt = (iso: string | undefined) => (iso ? format(new Date(iso), PUNCH_TIME_FORMAT) : null);
        return {
          data: summary.data,
          entrada: fmt(find('entrada')?.horario),
          inicioIntervalo: fmt(find('inicio_intervalo')?.horario),
          fimIntervalo: fmt(find('fim_intervalo')?.horario),
          saida: fmt(find('saida')?.horario),
          horasTrabalhadas: Number(summary.horas_trabalhadas || 0),
          status: summary.status,
        };
      });

    const horasPrevistasTotal = summaries.reduce((sum, s) => sum + Number(s.horas_previstas || 0), 0);
    const horasTrabalhadasTotal = summaries.reduce((sum, s) => sum + Number(s.horas_trabalhadas || 0), 0);
    const horasExtrasTotal = summaries.reduce((sum, s) => sum + Number(s.horas_extras || 0), 0);
    const saldoBancoHoras = ledger && ledger.length > 0 ? ledger[ledger.length - 1].saldo_acumulado : 0;

    generateEspelhoPontoPdf({
      employeeName,
      cargo,
      periodLabel,
      rows,
      horasPrevistasTotal,
      horasTrabalhadasTotal,
      horasExtrasTotal,
      saldoBancoHoras,
    });

    onDone();
  }, [punches, summaries, ledger, employeeName, cargo, periodLabel, onDone]);

  return null;
}

export default JornadaRelatorios;
