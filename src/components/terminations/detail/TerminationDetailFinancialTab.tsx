import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertTriangle } from 'lucide-react';
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
import { truncateToCents } from '@/lib/formatters';

interface Props {
  termination: TerminationWithEmployee;
}

interface StoredAdjustment {
  desc: string;
  value: number;
  isCredit: boolean;
  type: string;
  adjustmentType?: string;
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
    is_just_cause: t.is_just_cause ?? false,
    early_termination_initiated_by: null,
    exit_interview_completed: t.exit_interview_completed ?? false,
    exit_interview_notes: t.exit_interview_notes || '',
    notice_period_days: t.notice_period_days ?? 30,
    notice_worked: t.notice_worked ?? false,
    notice_indemnified_by_company: true,
    notice_notes: '',
    manual_adjustments: [],
    document_files: {},
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

  // Recalcular não sabe reconstruir a indenização Art. 479/480 CLT (quem antecipou o contrato
  // de experiência não é persistido em coluna própria, só existe dentro do fluxo do wizard) —
  // recalcular apagaria esse valor silenciosamente em vez de só aproximar. Bloqueado até existir
  // uma coluna dedicada para isso.
  const blocksRecalculation = termination.termination_type === 'early_contract_termination';

  // Check if we have stored JSONB data
  const storedAdjustments = useMemo(() => {
    const raw = termination.final_payroll_adjustments;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as StoredAdjustment[];
    }
    return null;
  }, [termination.final_payroll_adjustments]);

  // Fallback: query payroll_adjustments table only if no JSONB data
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-adjustments', termination.id],
    queryFn: () => terminationService.getPayrollAdjustments(termination.id),
    enabled: !storedAdjustments, // only query if no JSONB
  });

  // Separate stored data into auto-calcs and manual
  const { storedAutoCalcs, storedManualAdjs } = useMemo(() => {
    if (!storedAdjustments) return { storedAutoCalcs: [], storedManualAdjs: [] };
    return {
      storedAutoCalcs: storedAdjustments.filter(a => a.type === 'auto'),
      storedManualAdjs: storedAdjustments.filter(a => a.type === 'manual'),
    };
  }, [storedAdjustments]);

  // Fallback auto-calcs (on-the-fly) when no JSONB
  const fallbackAutoCalcs = useMemo(() => {
    if (storedAdjustments) return [];
    const emp = buildEmployeeLike(termination);
    const wizData = buildWizardDataLike(termination);
    return calculateAutoCalcs(emp, wizData);
  }, [termination, storedAdjustments]);

  const addMutation = useMutation({
    mutationFn: async () => {
      // Try adding to payroll_adjustments table
      try {
        await terminationService.addPayrollAdjustment({
          termination_id: termination.id,
          adjustment_type: newType,
          description: newDesc || null,
          amount: Number(newAmount),
          is_credit: newIsCredit,
        });
      } catch { /* RLS may block */ }

      // Also update the JSONB column
      const currentAdjs = storedAdjustments || [];
      const newAdj: StoredAdjustment = {
        desc: newDesc || ADJUSTMENT_TYPE_LABELS[newType],
        value: Number(newAmount),
        isCredit: newIsCredit,
        type: 'manual',
        adjustmentType: newType,
      };
      await terminationService.update(termination.id, {
        final_payroll_adjustments: [...currentAdjs, newAdj],
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', termination.id] });
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['termination', termination.id] });
      toast({ title: 'Ajuste adicionado' });
      resetForm();
      // Force reload to get updated JSONB
      window.location.reload();
    },
    onError: () => toast({ title: 'Erro ao adicionar', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await terminationService.deletePayrollAdjustment(id);
      } catch { /* RLS may block */ }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', termination.id] });
      toast({ title: 'Ajuste removido' });
    },
  });

  // Regrava as verbas calculadas com a fórmula atual — necessário porque `final_payroll_adjustments`
  // é congelado na finalização da rescisão e nunca se atualiza sozinho quando a fórmula de
  // cálculo muda depois (ex.: correção dos avos de 13º/férias). Preserva os ajustes manuais.
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const emp = buildEmployeeLike(termination);
      const wizData = buildWizardDataLike(termination);
      const newAutoCalcs = calculateAutoCalcs(emp, wizData);
      const preservedManual = (storedAdjustments ?? []).filter(a => a.type === 'manual');
      const newAdjustments: StoredAdjustment[] = [
        ...newAutoCalcs.map(item => ({
          desc: item.desc,
          value: Math.round(item.value * 100) / 100,
          isCredit: item.isCredit,
          type: 'auto',
        })),
        ...preservedManual,
      ];
      await terminationService.update(termination.id, {
        final_payroll_adjustments: newAdjustments,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['termination', termination.id] });
      toast({ title: 'Verbas recalculadas com a fórmula atual' });
      window.location.reload();
    },
    onError: () => toast({ title: 'Erro ao recalcular verbas', variant: 'destructive' }),
  });

  const resetForm = () => {
    setShowForm(false);
    setNewType('other');
    setNewDesc('');
    setNewAmount('');
    setNewIsCredit(true);
  };

  const fmt = (v: number) =>
    truncateToCents(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Compute totals from whichever source we have
  const totals = useMemo(() => {
    let credits = 0;
    let debits = 0;

    if (storedAdjustments) {
      storedAdjustments.forEach(item => {
        if (item.isCredit) credits += item.value;
        else debits += item.value;
      });
    } else {
      fallbackAutoCalcs.forEach(item => {
        if (item.isCredit) credits += item.value;
        else debits += item.value;
      });
      (data?.adjustments ?? []).forEach(adj => {
        if (adj.is_credit) credits += Number(adj.amount);
        else debits += Number(adj.amount);
      });
    }

    return { credits, debits, net: credits - debits };
  }, [storedAdjustments, fallbackAutoCalcs, data]);

  // Items to display in the "Verbas Rescisórias" section
  const displayAutoCalcs = storedAdjustments ? storedAutoCalcs : fallbackAutoCalcs;
  // Items to display in "Ajustes Manuais" section
  const displayManualAdjs = storedAdjustments ? storedManualAdjs : [];

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
      {displayAutoCalcs.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Verbas Rescisórias (Calculadas)</CardTitle>
            {storedAdjustments && !blocksRecalculation && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isPending}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {recalculateMutation.isPending ? 'Recalculando...' : 'Recalcular verbas'}
              </Button>
            )}
          </CardHeader>
          {storedAdjustments && blocksRecalculation && (
            <CardContent className="pt-0 pb-3">
              <Alert variant="destructive" className="border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs">
                  Recalcular está desabilitado para "Fim Antecipado de Contrato" — o sistema não guarda quem antecipou o desligamento (empresa/funcionário) fora do fluxo do wizard, então recalcular apagaria a indenização Art. 479/480 CLT em vez de só atualizar os valores. Ajuste manualmente se precisar corrigir algo aqui.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
          {storedAdjustments && !blocksRecalculation && (
            <CardContent className="pt-0 pb-3">
              <p className="text-xs text-muted-foreground">
                Recalcular assume aviso prévio indenizado pela empresa (não descontado do funcionário) — confira manualmente se este desligamento tinha o aviso descontado.
              </p>
            </CardContent>
          )}
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
                {displayAutoCalcs.map((item, i) => {
                  const desc = 'desc' in item ? item.desc : '';
                  const value = 'value' in item ? item.value : 0;
                  const isCredit = 'isCredit' in item ? item.isCredit : true;
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{desc}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{fmt(value)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={isCredit ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700' : 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700'}>
                          {isCredit ? 'Crédito' : 'Débito'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

          {/* Show stored manual adjustments from JSONB */}
          {displayManualAdjs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">C/D</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayManualAdjs.map((adj, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{adj.desc}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{fmt(adj.value)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={adj.isCredit ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700' : 'text-red-600 border-red-300 dark:text-red-400 dark:border-red-700'}>
                        {adj.isCredit ? 'Crédito' : 'Débito'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : isLoading && !storedAdjustments ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : !storedAdjustments && !data?.adjustments.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ajuste manual registrado.</p>
          ) : !storedAdjustments && data?.adjustments.length ? (
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
          ) : !displayManualAdjs.length && storedAdjustments ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ajuste manual registrado.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
