import { FileText, CheckCircle2, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectTimesheetSubmission } from '@/types/timesheetSubmission';

interface TimesheetWeekStatusProps {
  submissions: Map<string, ProjectTimesheetSubmission>;
  totalProjects: number;
  totalHours: number;
  onSubmitAll: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

export function TimesheetWeekStatus({
  submissions,
  totalProjects,
  totalHours,
  onSubmitAll,
  isSubmitting,
  canSubmit,
}: TimesheetWeekStatusProps) {
  const submittedCount = Array.from(submissions.values()).filter(
    s => s.status === 'submitted'
  ).length;
  
  const pendingCount = totalProjects - submittedCount;
  const allSubmitted = submittedCount === totalProjects && totalProjects > 0;

  if (allSubmitted) {
    return (
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
    );
  }

  return (
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
              <Button
                onClick={onSubmitAll}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
