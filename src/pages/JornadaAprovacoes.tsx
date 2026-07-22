import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, History, Inbox, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePendingAdjustmentRequests, useAllAdjustmentRequests } from '@/hooks/useTimeAdjustments';
import { TimeAdjustmentApprovalCard } from '@/components/timetracking/TimeAdjustmentApprovalCard';
import { RegisterAbsenceDialog } from '@/components/timetracking/RegisterAbsenceDialog';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejeitado: { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const TIPO_LABELS: Record<string, string> = {
  ajuste_ponto: 'Ajuste de ponto',
  hora_extra: 'Hora extra',
  atestado: 'Atestado',
  ferias: 'Férias',
  falta: 'Falta',
};

const JornadaAprovacoes = () => {
  const { data: pending, isLoading: loadingPending } = usePendingAdjustmentRequests();
  const { data: all, isLoading: loadingAll } = useAllAdjustmentRequests();

  const decided = (all || []).filter((r) => r.status !== 'pendente');

  return (
    <AppLayout
      title="Ponto Eletrônico — Aprovações"
      description="Ajustes de ponto e horas extras aguardando decisão"
      actions={<RegisterAbsenceDialog />}
    >
      <div className="space-y-6">
        <div>
          <h2 className="mb-3 flex items-center gap-2">
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full',
                pending && pending.length > 0 ? 'bg-warning-subtle text-warning-emphasis' : 'bg-success-subtle text-success-emphasis',
              )}
            >
              {pending && pending.length > 0 ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </span>
            <span className="text-sm font-medium text-foreground">Aguardando decisão</span>
            {pending && pending.length > 0 && (
              <Badge variant="secondary" className="bg-warning-subtle text-warning-emphasis">{pending.length}</Badge>
            )}
          </h2>
          {loadingPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !pending || pending.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 text-muted-foreground/60" />
                Nenhuma solicitação pendente.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((request) => (
                <TimeAdjustmentApprovalCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <History className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-foreground">Histórico</span>
          </h2>
          {loadingAll ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : decided.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 text-muted-foreground/60" />
                Nenhuma solicitação decidida ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {decided.map((request) => {
                const statusConfig = STATUS_LABELS[request.status];
                return (
                  <Card
                    key={request.id}
                    className={cn(
                      'border-l-4',
                      request.status === 'aprovado' ? 'border-l-success' : 'border-l-destructive',
                    )}
                  >
                    <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{request.employees?.nome ?? 'Colaborador'}</p>
                          <Badge variant="secondary">
                            {TIPO_LABELS[request.tipo] ?? request.tipo}
                          </Badge>
                          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(request.data_referencia), 'dd/MM/yyyy', { locale: ptBR })}
                          {request.data_fim && request.data_fim !== request.data_referencia &&
                            ` a ${format(parseISO(request.data_fim), 'dd/MM/yyyy', { locale: ptBR })}`}
                          {request.motivo_decisao && ` · ${request.motivo_decisao}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default JornadaAprovacoes;
