import { useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { formatCurrency, parseDateString, toLocalDateString } from '@/lib/formatters';
import { TerminationWizardData } from './types';

interface Props {
  data: TerminationWizardData;
  onChange: (partial: Partial<TerminationWizardData>) => void;
  admissionDate: string;
  salary: number;
}

function fullYearsBetween(start: Date, end: Date): number {
  let years = end.getFullYear() - start.getFullYear();
  const beforeAnniversary =
    end.getMonth() < start.getMonth() || (end.getMonth() === start.getMonth() && end.getDate() < start.getDate());
  if (beforeAnniversary) years--;
  return Math.max(0, years);
}

/** Lei 12.506/2011: 30 dias + 3 por ano completo de empresa, até 90 — contados a partir da
 *  data de comunicação do desligamento, não da data em que esta tela é aberta. */
function calcNoticeDays(admissionDate: string, notificationDate: string): number {
  const start = parseDateString(admissionDate);
  const reference = notificationDate ? parseDateString(notificationDate) : new Date();
  return Math.min(30 + fullYearsBetween(start, reference) * 3, 90);
}

function calcYearsWorked(admissionDate: string, notificationDate: string): number {
  const start = parseDateString(admissionDate);
  const reference = notificationDate ? parseDateString(notificationDate) : new Date();
  return fullYearsBetween(start, reference);
}

const TerminationStep2Notice = ({ data, onChange, admissionDate, salary }: Props) => {
  const yearsWorked = useMemo(
    () => calcYearsWorked(admissionDate, data.notification_date),
    [admissionDate, data.notification_date],
  );
  const calculatedDays = useMemo(
    () => calcNoticeDays(admissionDate, data.notification_date),
    [admissionDate, data.notification_date],
  );

  const noticeValue = useMemo(() => {
    return (salary / 30) * data.notice_period_days;
  }, [salary, data.notice_period_days]);

  // Set calculated days on mount
  if (data.notice_period_days === 30 && calculatedDays !== 30) {
    onChange({ notice_period_days: calculatedDays });
  }

  // Aviso trabalhado: a data de desligamento passa a ser DERIVADA (comunicação + dias de
  // aviso) — é o último dia efetivamente trabalhado, usado pelo resto do cálculo (saldo de
  // salário, avos de 13º/férias) e pela Folha de Pagamento, não a data de comunicação.
  useEffect(() => {
    if (!data.notice_worked || !data.notification_date) return;
    const notifDate = parseDateString(data.notification_date);
    const lastWorkDay = new Date(
      notifDate.getFullYear(),
      notifDate.getMonth(),
      notifDate.getDate() + data.notice_period_days,
    );
    const iso = toLocalDateString(lastWorkDay);
    if (data.termination_date !== iso) {
      onChange({ termination_date: iso });
    }
  }, [data.notice_worked, data.notification_date, data.notice_period_days, data.termination_date, onChange]);

  const finalDate = useMemo(() => {
    if (!data.termination_date) return null;
    return parseDateString(data.termination_date).toLocaleDateString('pt-BR');
  }, [data.termination_date]);

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Baseado em {yearsWorked} ano{yearsWorked !== 1 ? 's' : ''} de empresa, o aviso prévio é de <strong>{calculatedDays} dias</strong>.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:items-start">
        <div className="space-y-2">
          <Label>Dias de aviso prévio</Label>
          <Input
            type="number"
            min={0}
            max={90}
            value={data.notice_period_days}
            onChange={e => onChange({ notice_period_days: Number(e.target.value) || 0 })}
          />
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
          <Label htmlFor="notice-worked" className="cursor-pointer">Aviso prévio será trabalhado?</Label>
          <Switch
            id="notice-worked"
            checked={data.notice_worked}
            onCheckedChange={v => onChange({ notice_worked: v })}
          />
        </div>
      </div>

      {!data.notice_worked && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tipo</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ notice_indemnified_by_company: true })}
                  className={`px-3 py-1 rounded-md text-sm ${data.notice_indemnified_by_company ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  Indenizado pela empresa
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ notice_indemnified_by_company: false })}
                  className={`px-3 py-1 rounded-md text-sm ${!data.notice_indemnified_by_company ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  Descontado do funcionário
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor calculado:</span>
              <span className="font-semibold text-foreground">{formatCurrency(noticeValue)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {finalDate && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm text-muted-foreground">
            {data.notice_worked ? 'Último dia trabalhado (recalculado automaticamente):' : 'Data final do vínculo:'}
          </span>
          <span className="text-sm font-medium text-foreground">{finalDate}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label>Observações sobre o aviso (opcional)</Label>
        <Textarea
          value={data.notice_notes}
          onChange={e => onChange({ notice_notes: e.target.value })}
          placeholder="Observações adicionais..."
          rows={2}
        />
      </div>
    </div>
  );
};

export default TerminationStep2Notice;
