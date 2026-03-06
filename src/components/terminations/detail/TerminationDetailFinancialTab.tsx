import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService } from '@/services/terminationService';
import { TerminationWithEmployee } from '@/services/terminationService';
import {
  ADJUSTMENT_TYPES,
  ADJUSTMENT_TYPE_LABELS,
  PayrollAdjustmentType,
} from '@/types/termination';
import { useToast } from '@/hooks/use-toast';
import { calculateAutoCalcs } from '@/components/employees/termination-wizard/TerminationStep3Payroll';
import { Employee } from '@/hooks/useEmployees';
import { TerminationWizardData } from '@/components/employees/termination-wizard/types';

interface Props {
  termination: TerminationWithEmployee;
}

function buildEmployeeLike(t: TerminationWithEmployee): Employee {
  const emp = t.employees;
  return {
    id: emp.id,
    nome: emp.nome,
    cargo: emp.cargo,
    email: emp.email,
    tipoContratacao: emp.tipo_contratacao,
    fotoUrl: emp.foto_url,
    salarioMensal: emp.salario_mensal ?? 0,
    fgts: emp.fgts ?? 0,
    dataAdmissao: emp.data_admissao ?? '',
    proLabore: emp.pro_labore ?? 0,
    bolsaAuxilio: emp.bolsa_auxilio ?? 0,
    cpf: '',
    telefone: '',
    tenantId: '',
    status: 'ativo',
    salarioLiquido: 0,
    beneficios: 0,
    encargos: 0,
    inssEmpresa: 0,
    decimoTerceiro: 0,
    ferias: 0,
    jornadaDiaria: 8,
    jornadaMensal: 176,
    isGerente: false,
    valorContratoPj: 0,
    dividendos: 0,
    provisao13: 0,
    provisaoFerias: 0,
    provisaoRecesso: 0,
    totalMonthlyCostEstimated: 0,
    totalAnnualCostEstimated: 0,
    systemRole: 'user',
    mustChangePassword: false,
    breakdownJson: null,
    dataNascimento: null,
    totalToolsCost: 0,
    totalBenefitsCost: 0,
    createdAt: '',
    updatedAt: '',
  } as unknown as Employee;
}

function buildWizardDataLike(t: TerminationWithEmployee): TerminationWizardData {
  return {
    notification_date: t.notification_date || '',
    termination_date: t.termination_date,
    termination_type: t.termination_type as any,
    reason_category: t.reason_category as any,
    reason: t.reason || '',
    exit_interview_completed: t.exit_interview_completed ?? false,
    exit_interview_notes: t.exit_interview_notes || '',
    notice_period_days: t.notice_period_days ?? 30,
    notice_worked: t.notice_worked ?? false,
    notice_indemnified_by_company: true,
    notice_notes: '',
    manual_adjustments: [],
    uploaded_files: [],
    document_checklist: {},
  };
}

export const TerminationDetailFinancialTab = ({ termination }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState<PayrollAdjustmentType>('other');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newIsCredit, setNewIsCredit] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-adjustments', termination.id],
    queryFn: () => terminationService.getPayrollAdjustments(termination.id),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      terminationService.addPayrollAdjustment({
        termination_id: termination.id,
        adjustment_type: newType,
        description: newDesc || null,
        amount: Number(newAmount),
        is_credit: newIsCredit,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', termination.id] });
      toast({ title: 'Ajuste adicionado' });
      resetForm();
    },
    onError: () => toast({ title: 'Erro ao adicionar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => terminationService.deletePayrollAdjustment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', termination.id] });
      toast({ title: 'Ajuste removido' });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setNewType('other');
    setNewDesc('');
    setNewAmount('');
    setNewIsCredit(true);
  };

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Auto-calculated rescission values
  const autoCalcs = useMemo(() => {
    const emp = buildEmployeeLike(termination);
    const wizData = buildWizardDataLike(termination);
    return calculateAutoCalcs(emp, wizData);
  }, [termination]);

  // Totals combining auto-calcs + DB adjustments
  const totals = useMemo(() => {
    let credits = 0;
    let debits = 0;

    autoCalcs.forEach(item => {
      if (item.isCredit) credits += item.value;
      else debits += item.value;
    });

    (data?.adjustments ?? []).forEach(adj => {
      if (adj.is_credit) credits += Number(adj.amount);
      else debits += Number(adj.amount);
    });

    return { credits, debits, net: credits - debits };
  }, [autoCalcs, data]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Créditos</p>
              <p className="font-semibold text-green-600 dark:text-green-400">{fmt(totals.credits)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-2">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Débitos</p>
              <p className="font-semibold text-red-600 dark:text-red-400">{fmt(totals.debits)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Líquido</p>
              <p className="font-bold text-blue-600 dark:text-blue-400">{fmt(totals.net)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-calculated Rescission Values */}
      {autoCalcs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verbas Rescisórias (Calculadas)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">C/D</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoCalcs.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.desc}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{fmt(item.value)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={item.isCredit ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700' : 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700'}>
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

      {/* Manual Adjustments Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ajustes Manuais</CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as PayrollAdjustmentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADJUSTMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{ADJUSTMENT_TYPE_LABELS[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newIsCredit} onCheckedChange={setNewIsCredit} />
                <Label className="text-xs">{newIsCredit ? 'Crédito' : 'Débito'}</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addMutation.mutate()} disabled={!newAmount || addMutation.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : !data?.adjustments.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ajuste manual registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">C/D</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.adjustments.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell className="text-sm">{ADJUSTMENT_TYPE_LABELS[adj.adjustment_type as PayrollAdjustmentType]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{adj.description || '—'}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{fmt(Number(adj.amount))}</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-xs font-medium ${adj.is_credit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {adj.is_credit ? 'C' : 'D'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(adj.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
