import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Briefcase } from 'lucide-react';
import { TerminationWithEmployee } from '@/services/terminationService';
import {
  TERMINATION_TYPE_LABELS,
  REASON_CATEGORY_LABELS,
  TerminationType,
  ReasonCategory,
} from '@/types/termination';

interface Props {
  termination: TerminationWithEmployee;
}

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-2 border-b border-border last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || '—'}</span>
  </div>
);

export const TerminationDetailInfoTab = ({ termination }: Props) => {
  const emp = termination.employees;

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" /> Dados do Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Nome completo" value={emp.nome} />
          <InfoRow label="E-mail" value={emp.email} />
          <InfoRow label="Cargo" value={emp.cargo} />
          <InfoRow
            label="Tipo de contrato"
            value={
              <Badge variant="outline" className="font-medium">
                {emp.tipo_contratacao}
              </Badge>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" /> Dados do Desligamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <InfoRow label="Data de comunicação" value={formatDate(termination.notification_date)} />
          <InfoRow label="Data efetiva" value={formatDate(termination.termination_date)} />
          <InfoRow
            label="Tipo"
            value={TERMINATION_TYPE_LABELS[termination.termination_type as TerminationType]}
          />
          <InfoRow
            label="Categoria do motivo"
            value={REASON_CATEGORY_LABELS[termination.reason_category as ReasonCategory]}
          />
          <InfoRow label="Motivo detalhado" value={termination.reason} />
          <InfoRow
            label="Aviso prévio"
            value={
              termination.notice_period_days != null
                ? `${termination.notice_period_days} dias — ${termination.notice_worked ? 'Trabalhado' : 'Indenizado'}`
                : '—'
            }
          />
          <InfoRow
            label="Entrevista de desligamento"
            value={termination.exit_interview_completed ? 'Realizada' : 'Não realizada'}
          />
          {termination.exit_interview_notes && (
            <InfoRow label="Notas da entrevista" value={termination.exit_interview_notes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
