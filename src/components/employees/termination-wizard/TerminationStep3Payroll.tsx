import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
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

const TerminationStep3Payroll = ({ data, onChange, employee }: Props) => {
  const [newAdj, setNewAdj] = useState({ type: 'other', description: '', amount: 0, isCredit: true });

  // Auto calculations
  const autoCalcs = useMemo(() => {
    const salary = employee.salarioMensal;
    const termDate = data.termination_date ? parseDateString(data.termination_date) : new Date();
    const dayOfMonth = termDate.getDate();
    const daysInMonth = new Date(termDate.getFullYear(), termDate.getMonth() + 1, 0).getDate();

    const admDate = parseDateString(employee.dataAdmissao);
    const monthsWorked = (termDate.getFullYear() - admDate.getFullYear()) * 12 + (termDate.getMonth() - admDate.getMonth());
    const monthsInYear = termDate.getMonth() + 1;

    const salaryBalance = (salary / daysInMonth) * dayOfMonth;
    const vacationProp = (salary / 12) * (monthsWorked % 12) * (4 / 3); // + 1/3
    const thirteenthProp = (salary / 12) * monthsInYear;

    const isCLT = employee.tipoContratacao === 'CLT';
    const fgtsFine = isCLT ? employee.fgts * monthsWorked * 0.4 : 0;

    const noticeValue = !data.notice_worked ? (salary / 30) * data.notice_period_days : 0;
    const noticeIsCredit = data.notice_indemnified_by_company;

    const items = [
      { desc: `Saldo de salário (${dayOfMonth} dias)`, value: salaryBalance, isCredit: true },
      { desc: 'Férias proporcionais + 1/3', value: vacationProp, isCredit: true },
      { desc: '13º proporcional', value: thirteenthProp, isCredit: true },
    ];

    if (isCLT && fgtsFine > 0) {
      items.push({ desc: 'Multa FGTS 40%', value: fgtsFine, isCredit: true });
    }

    if (noticeValue > 0) {
      items.push({
        desc: `Aviso prévio ${noticeIsCredit ? 'indenizado' : '(desconto)'}`,
        value: noticeValue,
        isCredit: noticeIsCredit,
      });
    }

    return items;
  }, [employee, data]);

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
      {/* Auto calculations */}
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
                <Input className="h-9" value={newAdj.description} onChange={e => setNewAdj(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div>
                <Label className="text-xs">Valor (R$)</Label>
                <Input className="h-9" type="number" min={0} step={0.01} value={newAdj.amount || ''} onChange={e => setNewAdj(p => ({ ...p, amount: Number(e.target.value) }))} />
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

export default TerminationStep3Payroll;
