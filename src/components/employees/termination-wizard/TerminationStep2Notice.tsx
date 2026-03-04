import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { TerminationWizardData } from './types';

interface Props {
  data: TerminationWizardData;
  onChange: (partial: Partial<TerminationWizardData>) => void;
  admissionDate: string;
  salary: number;
}

function calcNoticeDays(admissionDate: string): number {
  const start = parseDateString(admissionDate);
  const now = new Date();
  const years = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Math.min(30 + years * 3, 90);
}

function calcYearsWorked(admissionDate: string): number {
  const start = parseDateString(admissionDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

const TerminationStep2Notice = ({ data, onChange, admissionDate, salary }: Props) => {
  const yearsWorked = useMemo(() => calcYearsWorked(admissionDate), [admissionDate]);
  const calculatedDays = useMemo(() => calcNoticeDays(admissionDate), [admissionDate]);

  const noticeValue = useMemo(() => {
    return (salary / 30) * data.notice_period_days;
  }, [salary, data.notice_period_days]);

  const finalDate = useMemo(() => {
    if (!data.termination_date) return null;
    const termDate = parseDateString(data.termination_date);
    if (data.notice_worked) {
      termDate.setDate(termDate.getDate() + data.notice_period_days);
    }
    return termDate.toLocaleDateString('pt-BR');
  }, [data.termination_date, data.notice_period_days, data.notice_worked]);

  // Set calculated days on mount
  if (data.notice_period_days === 30 && calculatedDays !== 30) {
    onChange({ notice_period_days: calculatedDays });
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Baseado em {yearsWorked} ano{yearsWorked !== 1 ? 's' : ''} de empresa, o aviso prévio é de <strong>{calculatedDays} dias</strong>.
        </AlertDescription>
      </Alert>

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

      <div className="flex items-center justify-between p-3 rounded-lg border border-border">
        <Label htmlFor="notice-worked" className="cursor-pointer">Aviso prévio será trabalhado?</Label>
        <Switch
          id="notice-worked"
          checked={data.notice_worked}
          onCheckedChange={v => onChange({ notice_worked: v })}
        />
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
          <span className="text-sm text-muted-foreground">Data final do vínculo:</span>
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
