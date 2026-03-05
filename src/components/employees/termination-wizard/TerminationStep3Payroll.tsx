import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Info } from 'lucide-react';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { Employee } from '@/hooks/useEmployees';
import { TerminationWizardData, ManualAdjustment } from './types';

interface Props {
  data: TerminationWizardData;
  onChange: (partial: Partial<TerminationWizardData>) => void;
  employee: Employee;
}

const ADJUSTMENT_OPTIONS = [
  { value: 'overtime', label: 'Horas extras' },
  { value: 'commission', label: 'Comissão / Adicional' },
  { value: 'advance_discount', label: 'Desconto adiantamento' },
  { value: 'benefits_discount', label: 'Desconto benefícios' },
  { value: 'transport', label: 'Vale transporte' },
  { value: 'other', label: 'Outro' },
];

const CONTRACT_TYPE_MESSAGES: Record<string, { title: string; description: string }> = {
  CLT: {
    title: 'Rescisão CLT',
    description: 'Cálculos incluem saldo de salário, férias proporcionais + 1/3, 13º proporcional e multa FGTS conforme tipo de desligamento.',
  },
  ESTAGIO: {
    title: 'Encerramento de Estágio',
    description: 'Conforme Lei 11.788/2008, o estagiário tem direito ao saldo de bolsa-auxílio e recesso remunerado proporcional (30 dias/ano, sem 1/3 constitucional).',
  },
  PJ: {
    title: 'Rescisão de Contrato PJ',
    description: 'Não há cálculos trabalhistas automáticos. Os valores devem seguir o previsto no contrato de prestação de serviços. Use os ajustes manuais abaixo.',
  },
  SOCIO: {
    title: 'Saída de Sócio',
    description: 'Sócio tem direito ao pró-labore proporcional. Não há férias, 13º ou FGTS. Ajustes de participação societária devem ser feitos manualmente.',
  },
  MENOR_APRENDIZ: {
    title: 'Rescisão de Menor Aprendiz',
    description: 'Segue regras da CLT com FGTS reduzido a 2% (Lei 10.097/2000). Contratos por prazo determinado não geram multa FGTS no término regular.',
  },
};

interface AutoCalcItem {
  desc: string;
  value: number;
  isCredit: boolean;
}

function calculateAutoCalcs(employee: Employee, data: TerminationWizardData): AutoCalcItem[] {
  const salary = employee.salarioMensal;
  const termDate = data.termination_date ? parseDateString(data.termination_date) : new Date();
  const dayOfMonth = termDate.getDate();
  const daysInMonth = new Date(termDate.getFullYear(), termDate.getMonth() + 1, 0).getDate();
  const admDate = parseDateString(employee.dataAdmissao);
  const monthsWorked = (termDate.getFullYear() - admDate.getFullYear()) * 12 + (termDate.getMonth() - admDate.getMonth());
  const monthsInYear = termDate.getMonth() + 1;
  const contractType = employee.tipoContratacao;

  const items: AutoCalcItem[] = [];

  switch (contractType) {
    case 'CLT': {
      const salaryBalance = (salary / daysInMonth) * dayOfMonth;
      const vacationProp = (salary / 12) * (monthsWorked % 12) * (4 / 3);
      const thirteenthProp = (salary / 12) * monthsInYear;

      items.push({ desc: `Saldo de salário (${dayOfMonth} dias)`, value: salaryBalance, isCredit: true });
      items.push({ desc: 'Férias proporcionais + 1/3', value: vacationProp, isCredit: true });
      items.push({ desc: '13º proporcional', value: thirteenthProp, isCredit: true });

      // FGTS fine based on termination type
      if (data.termination_type === 'involuntary') {
        const fgtsFine = employee.fgts * monthsWorked * 0.4;
        if (fgtsFine > 0) items.push({ desc: 'Multa FGTS 40%', value: fgtsFine, isCredit: true });
      } else if (data.termination_type === 'mutual_agreement') {
        const fgtsFine = employee.fgts * monthsWorked * 0.2;
        if (fgtsFine > 0) items.push({ desc: 'Multa FGTS 20% (acordo)', value: fgtsFine, isCredit: true });
      }

      // Notice period
      if (!data.notice_worked && data.notice_period_days > 0) {
        const noticeValue = (salary / 30) * data.notice_period_days;
        items.push({
          desc: `Aviso prévio ${data.notice_indemnified_by_company ? 'indenizado' : '(desconto)'}`,
          value: noticeValue,
          isCredit: data.notice_indemnified_by_company,
        });
      }
      break;
    }

    case 'ESTAGIO': {
      const stipendBalance = (salary / daysInMonth) * dayOfMonth;
      // Recesso: 30 dias por 12 meses, proporcional, sem 1/3
      const recessDays = (monthsWorked / 12) * 30;
      const recessValue = (salary / 30) * recessDays;

      items.push({ desc: `Saldo de bolsa-auxílio (${dayOfMonth} dias)`, value: stipendBalance, isCredit: true });
      items.push({ desc: `Recesso remunerado proporcional (${Math.round(recessDays)} dias)`, value: recessValue, isCredit: true });
      break;
    }

    case 'SOCIO': {
      const proLaboreBalance = (employee.proLabore / daysInMonth) * dayOfMonth;
      if (proLaboreBalance > 0) {
        items.push({ desc: `Pró-labore proporcional (${dayOfMonth} dias)`, value: proLaboreBalance, isCredit: true });
      }
      break;
    }

    case 'MENOR_APRENDIZ': {
      const salaryBalance = (salary / daysInMonth) * dayOfMonth;
      const vacationProp = (salary / 12) * (monthsWorked % 12) * (4 / 3);
      const thirteenthProp = (salary / 12) * monthsInYear;
      // FGTS 2% instead of 8% - no fine for end of fixed-term contract
      const fgtsValue = salary * 0.02 * monthsWorked;

      items.push({ desc: `Saldo de salário (${dayOfMonth} dias)`, value: salaryBalance, isCredit: true });
      items.push({ desc: 'Férias proporcionais + 1/3', value: vacationProp, isCredit: true });
      items.push({ desc: '13º proporcional', value: thirteenthProp, isCredit: true });
      items.push({ desc: 'FGTS acumulado (alíquota 2%)', value: fgtsValue, isCredit: true });
      break;
    }

    case 'PJ':
    default:
      // No automatic calculations for PJ
      break;
  }

  return items;
}

const TerminationStep3Payroll = ({ data, onChange, employee }: Props) => {
  const [newAdj, setNewAdj] = useState({ type: 'other', description: '', amount: 0, isCredit: true });

  const contractType = employee.tipoContratacao;
  const message = CONTRACT_TYPE_MESSAGES[contractType] || CONTRACT_TYPE_MESSAGES.CLT;

  const autoCalcs = useMemo(() => calculateAutoCalcs(employee, data), [employee, data]);

  const totals = useMemo(() => {
    let credits = 0;
    let debits = 0;

    autoCalcs.forEach(item => {
      if (item.isCredit) credits += item.value;
      else debits += item.value;
    });

    data.manual_adjustments.forEach(adj => {
      if (adj.isCredit) credits += adj.amount;
      else debits += adj.amount;
    });

    return { credits, debits, net: credits - debits };
  }, [autoCalcs, data.manual_adjustments]);

  const addAdjustment = () => {
    if (!newAdj.description || newAdj.amount <= 0) return;
    const adj: ManualAdjustment = {
      id: crypto.randomUUID(),
      type: newAdj.type,
      description: newAdj.description,
      amount: newAdj.amount,
      isCredit: newAdj.isCredit,
    };
    onChange({ manual_adjustments: [...data.manual_adjustments, adj] });
    setNewAdj({ type: 'other', description: '', amount: 0, isCredit: true });
  };

  const removeAdjustment = (id: string) => {
    onChange({ manual_adjustments: data.manual_adjustments.filter(a => a.id !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Context message */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>{message.title}</strong> — {message.description}
        </AlertDescription>
      </Alert>

      {/* Auto calculations */}
      {autoCalcs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cálculos Automáticos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoCalcs.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.desc}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(item.value)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={item.isCredit ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}>
                        {item.isCredit ? 'Crédito' : 'Débito'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manual adjustments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ajustes Manuais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.manual_adjustments.length > 0 && (
            <div className="space-y-2">
              {data.manual_adjustments.map(adj => (
                <div key={adj.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                  <div>
                    <span className="font-medium">{adj.description}</span>
                    <Badge variant="outline" className={`ml-2 ${adj.isCredit ? 'text-green-700 border-green-300' : 'text-red-700 border-red-300'}`}>
                      {adj.isCredit ? 'Crédito' : 'Débito'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(adj.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeAdjustment(adj.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={newAdj.type} onValueChange={v => setNewAdj(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={newAdj.description} onChange={e => setNewAdj(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <CurrencyInput className="h-9 text-right" value={newAdj.amount} onValueChange={v => setNewAdj(p => ({ ...p, amount: v }))} showPrefix />
              </div>
              <div className="flex items-center gap-2 h-9">
                <Switch checked={newAdj.isCredit} onCheckedChange={v => setNewAdj(p => ({ ...p, isCredit: v }))} />
                <span className="text-xs text-muted-foreground">{newAdj.isCredit ? 'Crédito' : 'Débito'}</span>
              </div>
              <Button size="sm" className="h-9" onClick={addAdjustment} disabled={!newAdj.description || newAdj.amount <= 0}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total de Créditos:</span>
            <span className="font-semibold text-green-700">{formatCurrency(totals.credits)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total de Débitos:</span>
            <span className="font-semibold text-red-700">{formatCurrency(totals.debits)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-medium text-foreground">Valor Líquido:</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(totals.net)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { calculateAutoCalcs };
export default TerminationStep3Payroll;
