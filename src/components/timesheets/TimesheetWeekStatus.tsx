import { useState, useEffect } from 'react';
import { FileText, CheckCircle2, Send, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectTimesheetSubmission } from '@/types/timesheetSubmission';
import { cn } from '@/lib/utils';

interface TimesheetWeekStatusProps {
  submissions: Map<string, ProjectTimesheetSubmission>;
  totalProjects: number;
  totalHours: number;
  onSubmitAll: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  allWeekDaysReady?: boolean;
  lockedProjectCount?: number;
  monthlyActual?: number;
  monthlyPlanned?: number;
  monthlyCapacity?: number;
}

function MonthlyContext({ actual, planned, capacity }: { actual: number; planned: number; capacity: number }) {
  const pct = capacity > 0 ? (actual / capacity) * 100 : 0;
  const color = pct > 100
    ? 'text-red-600 dark:text-red-400'
    : pct >= 80
    ? 'text-green-600 dark:text-green-400'
    : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Este mês:</span>
      <span className={`font-semibold ${color}`}>{Math.round(actual * 10) / 10}h reais</span>
      <span>·</span>
      <span>{Math.round(planned * 10) / 10}h planejadas</span>
      <span>·</span>
      <span>{Math.round(capacity * 10) / 10}h capacidade</span>
    </div>
  );
}

export function TimesheetWeekStatus({
  submissions,
  totalProjects,
  totalHours,
  onSubmitAll,
  isSubmitting,
  canSubmit,
  allWeekDaysReady = true,
  lockedProjectCount,
  monthlyActual,
  monthlyPlanned,
  monthlyCapacity,
}: TimesheetWeekStatusProps) {
  const submittedCount = lockedProjectCount !== undefined
    ? lockedProjectCount
    : Array.from(submissions.values()).filter(s => s.status === 'submitted').length;

  const pendingCount = totalProjects - submittedCount;
  const allSubmitted = submittedCount === totalProjects && totalProjects > 0;
  const showMonthly = monthlyActual !== undefined && monthlyPlanned !== undefined && monthlyCapacity !== undefined;

  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Re-exibir banner quando a semana muda e volta a ter pendências
  useEffect(() => {
    if (pendingCount > 0) setBannerDismissed(false);
  }, [pendingCount]);

  const showBanner = canSubmit && pendingCount > 0 && !bannerDismissed && !allSubmitted;

  return (
    <>
      {/* Card de status inline */}
      {allSubmitted ? (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-700 dark:text-green-300">
                      Todos os Projetos Enviados
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {submittedCount} de {totalProjects}
                    </Badge>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Todos os projetos desta semana foram enviados e estão travados.
                  </p>
                  {showMonthly && (
                    <MonthlyContext actual={monthlyActual!} planned={monthlyPlanned!} capacity={monthlyCapacity!} />
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total da Semana</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {totalHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-muted bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      Resumo da Semana
                    </span>
                    <Badge variant="secondary">
                      {submittedCount} de {totalProjects} enviados
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pendingCount > 0
                      ? `${pendingCount} projeto(s) pendente(s) de envio. Envie cada projeto individualmente ou todos de uma vez.`
                      : 'Nenhum projeto com horas lançadas.'}
                  </p>
                  {showMonthly && (
                    <MonthlyContext actual={monthlyActual!} planned={monthlyPlanned!} capacity={monthlyCapacity!} />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total atual</p>
                  <p className="text-lg font-semibold">
                    {totalHours.toFixed(1)}h
                  </p>
                </div>
                {canSubmit && pendingCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={onSubmitAll}
                          disabled={isSubmitting || !allWeekDaysReady}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Enviar ({pendingCount})
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!allWeekDaysReady && (
                      <TooltipContent>
                        <p>Aguarde todos os dias da semana para enviar</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner sticky no rodapé */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-card/95 backdrop-blur-sm border-t shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 shrink-0" />
                <span>
                  {pendingCount} projeto{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''} de envio
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn("flex-1 sm:flex-none", (!allWeekDaysReady || isSubmitting) && "cursor-not-allowed")}>
                      <Button
                        onClick={onSubmitAll}
                        disabled={isSubmitting || !allWeekDaysReady}
                        className="gap-2 w-full"
                      >
                        <Send className="h-4 w-4" />
                        Enviar Todos ({pendingCount})
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!allWeekDaysReady && (
                    <TooltipContent side="top">
                      <p>Aguarde todos os dias da semana para enviar</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Fechar banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
