import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { TerminationWizardData } from './types';
import { TERMINATION_TYPE_LABELS, TerminationType } from '@/types/termination';

interface Props {
  data: TerminationWizardData;
  onChange: (partial: Partial<TerminationWizardData>) => void;
  contractType: string;
  showErrors?: boolean;
}

const VOLUNTARY_REASONS = [
  { value: 'personal_request', label: 'Proposta melhor / Motivos pessoais' },
  { value: 'other', label: 'Outro' },
];

const INVOLUNTARY_REASONS = [
  { value: 'performance', label: 'Desempenho' },
  { value: 'restructuring', label: 'Reestruturação / Corte de custos' },
  { value: 'disciplinary', label: 'Comportamento / Disciplinar' },
  { value: 'other', label: 'Outro' },
];

const CONTRACT_END_REASONS = [
  { value: 'contract_expiration', label: 'Expiração de Contrato' },
  { value: 'other', label: 'Outro' },
];

function parseLocalDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TerminationStep1Info = ({ data, onChange, contractType, showErrors = false }: Props) => {
  // termination_type is initialized by parent
  const [notifOpen, setNotifOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);

  const reasonOptions = useMemo(() => {
    const t = data.termination_type;
    if (t === 'voluntary') return VOLUNTARY_REASONS;
    if (t === 'involuntary') return INVOLUNTARY_REASONS;
    return CONTRACT_END_REASONS;
  }, [data.termination_type]);

  const today = startOfDay(new Date());
  const minNotifDate = subDays(today, 45);
  const notifDate = parseLocalDate(data.notification_date);
  const termDate = parseLocalDate(data.termination_date);

  const daysRemaining = useMemo(() => {
    if (!termDate) return null;
    const now = new Date();
    const diff = Math.ceil((termDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [termDate]);

  return (
    <div className="space-y-4">
      {/* Notification date */}
      <div className="space-y-2">
        <Label>{contractType === 'PJ' ? 'Data de comunicação ao prestador' : 'Data de comunicação ao funcionário'}</Label>
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !notifDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {notifDate ? format(notifDate, 'dd/MM/yyyy') : 'Selecionar data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={notifDate}
              onSelect={d => { if (d) { onChange({ notification_date: toDateStr(d) }); setNotifOpen(false); } }}
              disabled={d => d > today || d < minNotifDate}
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">Máximo de 45 dias no passado</p>
      </div>

      {/* Termination date */}
      <div className="space-y-2">
        <Label>Data efetiva do desligamento *</Label>
        <Popover open={termOpen} onOpenChange={setTermOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !termDate && "text-muted-foreground", showErrors && !termDate && "border-destructive")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {termDate ? format(termDate, 'dd/MM/yyyy') : 'Selecionar data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={termDate}
              onSelect={d => { if (d) { onChange({ termination_date: toDateStr(d) }); setTermOpen(false); } }}
              disabled={d => d > today || (notifDate ? d < notifDate : false)}
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        {showErrors && !termDate && (
          <p className="text-xs text-destructive">Data obrigatória</p>
        )}
        {daysRemaining !== null && (
          <p className="text-xs text-muted-foreground">
            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : daysRemaining === 0 ? 'Hoje' : `${Math.abs(daysRemaining)} dias atrás`}
          </p>
        )}
      </div>

      {/* Termination type */}
      <div className="space-y-2">
        <Label>Tipo de desligamento *</Label>
        <Select
          value={data.termination_type}
          onValueChange={v => onChange({ termination_type: v as TerminationType, reason_category: 'other' })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(TERMINATION_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reason category */}
      <div className="space-y-2">
        <Label>Categoria do motivo</Label>
        <Select
          value={data.reason_category}
          onValueChange={v => onChange({ reason_category: v as any })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {reasonOptions.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Justa causa — apenas CLT/MENOR_APRENDIZ + involuntário */}
      {data.termination_type === 'involuntary' && (contractType === 'CLT' || contractType === 'MENOR_APRENDIZ') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <Label htmlFor="just-cause" className="cursor-pointer font-medium">Demissão por Justa Causa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Art. 482 CLT — comportamento grave do empregado</p>
            </div>
            <Switch
              id="just-cause"
              checked={data.is_just_cause}
              onCheckedChange={v => onChange({ is_just_cause: v })}
            />
          </div>
          {data.is_just_cause && (
            <Alert variant="destructive" className="border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-xs">
                <strong>Atenção — direitos rescisórios removidos por justa causa:</strong>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  <li>Férias proporcionais</li>
                  <li>13º proporcional</li>
                  <li>Aviso prévio indenizado</li>
                  <li>Multa FGTS (40%)</li>
                </ul>
                <span className="block mt-1">Mantém apenas o saldo de salário do período trabalhado.</span>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Detailed reason */}
      <div className="space-y-2">
        <Label>Motivo detalhado * <span className="text-xs text-muted-foreground">(mínimo 20 caracteres)</span></Label>
        <Textarea
          value={data.reason}
          onChange={e => onChange({ reason: e.target.value })}
          placeholder="Descreva o motivo do desligamento..."
          rows={3}
          className={cn(showErrors && data.reason.length < 20 && "border-destructive")}
        />
        {showErrors && data.reason.length < 20 ? (
          <p className="text-xs text-destructive">Mínimo de 20 caracteres ({data.reason.length}/20)</p>
        ) : (
          <p className="text-xs text-muted-foreground">{data.reason.length}/20 caracteres mínimos</p>
        )}
      </div>

      <Separator />

      {/* Exit interview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="exit-interview">Entrevista de saída realizada?</Label>
          <Switch
            id="exit-interview"
            checked={data.exit_interview_completed}
            onCheckedChange={v => onChange({ exit_interview_completed: v })}
          />
        </div>
        {data.exit_interview_completed && (
          <div className="space-y-2">
            <Label>Notas da entrevista</Label>
            <Textarea
              value={data.exit_interview_notes}
              onChange={e => onChange({ exit_interview_notes: e.target.value })}
              placeholder="Registre os principais pontos da entrevista de saída..."
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminationStep1Info;
