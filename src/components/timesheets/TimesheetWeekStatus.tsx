import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, CheckCircle2, Send, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimesheetSubmission } from '@/types/timesheetSubmission';

interface TimesheetWeekStatusProps {
  submission: TimesheetSubmission | null;
  totalHours: number;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  isAdmin?: boolean;
  onAdminEdit?: () => void;
}

export function TimesheetWeekStatus({
  submission,
  totalHours,
  onSubmit,
  isSubmitting,
  canSubmit,
  isAdmin = false,
  onAdminEdit,
}: TimesheetWeekStatusProps) {
  const isSubmitted = submission?.status === 'submitted';

  if (isSubmitted) {
    const submittedAt = submission.submitted_at
      ? format(new Date(submission.submitted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      : '';
    const submittedBy = submission.submitted_by_employee?.nome || 'Usuário';

    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-700 dark:text-green-300">
                    Semana Enviada
                  </span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    Travado
                  </Badge>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Enviado em {submittedAt} por {submittedBy}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {submission.total_hours.toFixed(1)}h
                </p>
              </div>
              {isAdmin && onAdminEdit && (
                <Button variant="outline" onClick={onAdminEdit} className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  Editar Semana
                </Button>
              )}
            </div>
          </div>
          {!isAdmin && (
            <p className="mt-2 text-xs text-muted-foreground">
              Apenas administradores podem editar os valores mediante justificativa.
            </p>
          )}
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
                  Rascunho
                </span>
                <Badge variant="secondary">
                  Em edição
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                As horas estão sendo salvas automaticamente, mas só serão consideradas após o envio.
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
            <Button
              onClick={onSubmit}
              disabled={isSubmitting || !canSubmit || totalHours === 0}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Semana
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
