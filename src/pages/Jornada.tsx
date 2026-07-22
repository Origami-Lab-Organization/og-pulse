import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  LogIn,
  LogOut,
  UtensilsCrossed,
  Play,
  Clock,
  Wallet,
  CalendarDays,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
  Timer,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useTodayPunches, useRecordPunch, useMonthPunches, type TimeEntryType } from '@/hooks/useTimePunches';
import { useTodaySummary, useMonthSummary } from '@/hooks/useTimeDailySummary';
import { useTimeBankBalance, useTimeBankLedger } from '@/hooks/useTimeBankBalance';
import { useTimeTrackingSettings } from '@/hooks/useTimeTrackingSettings';
import { useMyAdjustmentRequests } from '@/hooks/useTimeAdjustments';
import { RequestAdjustmentDialog } from '@/components/timetracking/RequestAdjustmentDialog';
import { PunchCameraDialog, type PunchConfirmResult } from '@/components/timetracking/PunchCameraDialog';
import { FaceEnrollmentCard } from '@/components/timetracking/FaceEnrollmentCard';
import { useFaceProfile } from '@/hooks/useFaceProfile';
import { generateEspelhoPontoPdf } from '@/lib/timeTrackingPdfGenerator';
import { uploadPunchSelfie } from '@/lib/timePunchSelfie';
import { useToast } from '@/hooks/use-toast';
import { formatHours } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  atraso: { label: 'Atraso', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  falta: { label: 'Falta', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  incompleto: { label: 'Incompleto', className: 'bg-muted text-muted-foreground' },
  ferias: { label: 'Férias', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  atestado: { label: 'Atestado', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const REQUEST_TIPO_LABELS: Record<string, string> = {
  ajuste_ponto: 'Ajuste de ponto',
  hora_extra: 'Hora extra',
  atestado: 'Atestado',
  ferias: 'Férias',
  falta: 'Falta',
};

const REQUEST_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejeitado: { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const PUNCH_SEQUENCE: TimeEntryType[] = ['entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'];

const PUNCH_CONFIG: Record<TimeEntryType, { label: string; icon: typeof LogIn }> = {
  entrada: { label: 'Entrada', icon: LogIn },
  inicio_intervalo: { label: 'Início Intervalo', icon: UtensilsCrossed },
  fim_intervalo: { label: 'Fim Intervalo', icon: Play },
  saida: { label: 'Saída', icon: LogOut },
};

const Jornada = () => {
  const { employee } = useAuth();
  const employeeId = employee?.id;

  const { data: todayPunches, isLoading: loadingPunches } = useTodayPunches(employeeId);
  const { data: todaySummary } = useTodaySummary(employeeId);
  const { data: bankBalance } = useTimeBankBalance(employeeId);
  const { data: settings } = useTimeTrackingSettings();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  const { data: monthSummaries, isLoading: loadingExtrato } = useMonthSummary(employeeId, monthStart, monthEnd);
  const { data: monthLedger } = useTimeBankLedger(employeeId, monthStart, monthEnd);
  const { data: monthPunches } = useMonthPunches(employeeId, monthStart, monthEnd);
  const { data: myRequests } = useMyAdjustmentRequests(employeeId);
  const { data: faceProfile } = useFaceProfile(employeeId);

  const recordPunch = useRecordPunch();
  const { toast } = useToast();
  const [pendingPunch, setPendingPunch] = useState<TimeEntryType | null>(null);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const limiteHorasExtras = settings?.limite_horas_extras_diarias ?? 2;

  const extratoRows = useMemo(() => {
    const saldoPorData = new Map((monthLedger || []).map((entry) => [entry.data, entry.saldo_acumulado]));
    return (monthSummaries || [])
      .slice()
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((summary) => ({
        ...summary,
        saldoAcumulado: saldoPorData.get(summary.data) ?? null,
        acimaDoLimite: Number(summary.horas_extras || 0) > limiteHorasExtras,
      }));
  }, [monthSummaries, monthLedger, limiteHorasExtras]);

  const lastTipo = todayPunches && todayPunches.length > 0
    ? todayPunches[todayPunches.length - 1].tipo
    : null;
  const lastIndex = lastTipo ? PUNCH_SEQUENCE.indexOf(lastTipo) : -1;
  const nextTipo = PUNCH_SEQUENCE[lastIndex + 1];

  const monthHorasExtras = (monthSummaries || []).reduce((sum, s) => sum + Number(s.horas_extras || 0), 0);
  const monthFaltas = (monthSummaries || []).filter((s) => s.status === 'falta').length;

  const handleConfirmPunch = async ({ selfieBlob, faceMatchStatus, faceMatchScore }: PunchConfirmResult) => {
    let selfiePath: string | null = null;

    if (selfieBlob && employeeId && employee?.tenant_id) {
      setUploadingSelfie(true);
      try {
        selfiePath = await uploadPunchSelfie(selfieBlob, { tenantId: employee.tenant_id, employeeId });
      } catch (error) {
        console.error('Erro ao enviar selfie:', error);
        toast({
          title: 'Não foi possível enviar a selfie',
          description: 'A marcação será registrada sem a foto.',
          variant: 'destructive',
        });
      } finally {
        setUploadingSelfie(false);
      }
    }

    if (!pendingPunch) return;
    recordPunch.mutate(
      { tipo: pendingPunch, employeeId, selfiePath, faceMatchStatus, faceMatchScore },
      { onSettled: () => setPendingPunch(null) },
    );
  };

  const handleGerarEspelho = () => {
    if (!monthSummaries || !employee) return;

    const punchesByDate = new Map<string, typeof monthPunches>();
    for (const p of monthPunches || []) {
      const date = p.horario.split('T')[0];
      punchesByDate.set(date, [...(punchesByDate.get(date) || []), p]);
    }

    const rows = monthSummaries
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((summary) => {
        const dayPunches = punchesByDate.get(summary.data) || [];
        const find = (tipo: TimeEntryType) => dayPunches.find((p) => p.tipo === tipo);
        const fmt = (iso: string | undefined) => (iso ? format(new Date(iso), 'HH:mm') : null);
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

    generateEspelhoPontoPdf({
      employeeName: employee.nome,
      cargo: employee.cargo,
      periodLabel: format(selectedMonth, 'MMMM yyyy', { locale: ptBR }),
      rows,
      horasPrevistasTotal: monthSummaries.reduce((sum, s) => sum + Number(s.horas_previstas || 0), 0),
      horasTrabalhadasTotal: monthSummaries.reduce((sum, s) => sum + Number(s.horas_trabalhadas || 0), 0),
      horasExtrasTotal: monthHorasExtras,
      saldoBancoHoras: monthLedger && monthLedger.length > 0 ? monthLedger[monthLedger.length - 1].saldo_acumulado : (bankBalance ?? 0),
    });
  };

  const bankBalanceValue = bankBalance ?? 0;

  return (
    <AppLayout
      title="Ponto Eletrônico"
      description="Registre seu ponto e acompanhe seu banco de horas"
      hideHeader
    >
      <div className="space-y-6">
        <div className="overflow-hidden rounded-xl bg-gradient-brand text-primary-foreground shadow-2">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Timer className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Ponto Eletrônico</p>
                <h1 className="ui-h1 text-white">
                  Olá, {employee?.nome?.split(' ')[0] ?? 'colaborador'}
                </h1>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="ui-mono text-3xl font-bold tabular-nums">{format(now, 'HH:mm:ss')}</p>
              <p className="text-sm capitalize text-white/80">
                {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar ponto</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPunches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PUNCH_SEQUENCE.map((tipo) => {
                  const config = PUNCH_CONFIG[tipo];
                  const Icon = config.icon;
                  const isNext = tipo === nextTipo;
                  const isDone = lastIndex >= PUNCH_SEQUENCE.indexOf(tipo);
                  return (
                    <Button
                      key={tipo}
                      size="lg"
                      variant={isNext ? 'default' : 'outline'}
                      disabled={!isNext || recordPunch.isPending}
                      onClick={() => setPendingPunch(tipo)}
                      className={cn(
                        'h-24 flex-col gap-2 rounded-xl border text-sm transition-all',
                        isNext && 'border-transparent bg-gradient-brand text-white shadow-2 hover:opacity-95',
                        isDone && !isNext && 'border-success-subtle bg-success-subtle text-success-emphasis opacity-100',
                        !isDone && !isNext && 'text-muted-foreground opacity-60',
                      )}
                    >
                      {isDone && !isNext ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            )}

            {todayPunches && todayPunches.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {todayPunches.map((entry) => (
                  <Badge key={entry.id} variant="secondary" className="gap-1">
                    <Check className="h-3 w-3 text-success" />
                    {PUNCH_CONFIG[entry.tipo].label} às {format(new Date(entry.horario), 'HH:mm', { locale: ptBR })}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas hoje</p>
                <p className="ui-h1">{formatHours(todaySummary?.horas_trabalhadas ?? 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  bankBalanceValue < 0 ? 'bg-destructive-subtle text-destructive-emphasis' : 'bg-success-subtle text-success-emphasis',
                )}
              >
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banco de horas</p>
                <p className={cn('ui-h1', bankBalanceValue < 0 && 'text-destructive-emphasis')}>
                  {formatHours(bankBalanceValue)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-subtle text-warning-emphasis">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas extras (mês)</p>
                <p className="ui-h1">{formatHours(monthHorasExtras)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faltas (mês)</p>
                <p className="ui-h1">{monthFaltas}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Extrato do mês</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth((d) => addMonths(d, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-28 text-center text-sm font-medium capitalize">
                {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedMonth((d) => addMonths(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={!monthSummaries || monthSummaries.length === 0} onClick={handleGerarEspelho}>
                <FileText className="mr-2 h-4 w-4" />
                Espelho PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingExtrato ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : extratoRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum registro neste mês.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Horas trabalhadas</TableHead>
                    <TableHead className="text-right">Horas extras</TableHead>
                    <TableHead className="text-right">Saldo acumulado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extratoRows.map((row) => {
                    const statusConfig = STATUS_LABELS[row.status] ?? STATUS_LABELS.incompleto;
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          {format(new Date(`${row.data}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusConfig.className}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatHours(row.horas_trabalhadas)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn(row.acimaDoLimite && 'font-medium text-amber-600 dark:text-amber-400')}>
                            {formatHours(row.horas_extras)}
                          </span>
                          {row.acimaDoLimite && (
                            <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700 dark:text-amber-400">
                              Acima do limite
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.saldoAcumulado === null ? '—' : formatHours(row.saldoAcumulado)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Minhas solicitações</CardTitle>
            {employeeId && employee?.tenant_id && (
              <RequestAdjustmentDialog employeeId={employeeId} tenantId={employee.tenant_id} />
            )}
          </CardHeader>
          <CardContent>
            {!myRequests || myRequests.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma solicitação enviada ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {myRequests.slice(0, 10).map((request) => {
                  const statusConfig = REQUEST_STATUS_LABELS[request.status];
                  return (
                    <div
                      key={request.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {REQUEST_TIPO_LABELS[request.tipo] ?? request.tipo}
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          {format(new Date(`${request.data_referencia}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
                          {request.data_fim && request.data_fim !== request.data_referencia &&
                            ` a ${format(new Date(`${request.data_fim}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR })}`}
                        </span>
                      </div>
                      <Badge variant="secondary" className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {employeeId && <FaceEnrollmentCard employeeId={employeeId} />}
      </div>

      <PunchCameraDialog
        open={pendingPunch !== null}
        onOpenChange={(open) => !open && setPendingPunch(null)}
        punchLabel={pendingPunch ? PUNCH_CONFIG[pendingPunch].label : ''}
        required={settings?.exigir_selfie ?? false}
        busy={uploadingSelfie || recordPunch.isPending}
        employeeId={employeeId}
        hasFaceProfile={!!faceProfile}
        onConfirm={handleConfirmPunch}
      />
    </AppLayout>
  );
};

export default Jornada;
