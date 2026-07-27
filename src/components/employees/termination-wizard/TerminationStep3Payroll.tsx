import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Info, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { calculateTerminationBreakdown } from '@/lib/terminationCalcs';
import { Employee } from '@/hooks/useEmployees';
import { usePayrollProfile } from '@/hooks/usePayrollProfile';
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

const UNSUPPORTED_TYPE_MESSAGE = {
  title: 'Tipo de contratação não suportado para cálculo automático',
  description: 'Este tipo de contratação não possui cálculo automático de rescisão. Consulte o RH ou a área jurídica para apurar os valores devidos. Use os ajustes manuais abaixo para registrar os valores acordados.',
};

const CONTRACT_TYPE_MESSAGES: Record<string, { title: string; description: string }> = {
  CLT: {
    title: 'Rescisão CLT',
    description: 'Cálculos incluem saldo de salário, férias proporcionais + 1/3, 13º proporcional e multa FGTS conforme tipo de desligamento.',
  },
  ESTAGIO: {
    title: 'Encerramento de Estágio',
    description: 'Conforme Lei 11.788/2008: saldo de bolsa-auxílio e recesso remunerado proporcional (30 dias/ano, sem 1/3 constitucional). Sem FGTS ou 13º.',
  },
  PJ: {
    title: 'Rescisão de Contrato PJ',
    description: 'Pagamento proporcional ao período trabalhado no mês, conforme valor do contrato. Sem FGTS, INSS patronal ou verbas trabalhistas. Use ajustes manuais para multas ou bônus contratuais.',
  },
  SOCIO: {
    title: 'Saída de Sócio — Tratamento via Contrato Social',
    description: 'A saída de sócio exige formalização via Alteração Contratual ou Ata de Reunião. Nenhum cálculo automático é aplicado. O sistema registra a saída e bloqueia o acesso.',
  },
  MENOR_APRENDIZ: {
    title: 'Rescisão de Menor Aprendiz',
    description: 'Segue regras da CLT com FGTS reduzido a 2% (Lei 10.097/2000). Contratos por prazo determinado não geram multa FGTS no término regular.',
  },
};


const TerminationStep3Payroll = ({ data, onChange, employee }: Props) => {
  const [newAdj, setNewAdj] = useState({ type: 'other', description: '', amount: 0, isCredit: true });

  const contractType = employee.tipoContratacao;
  const message = CONTRACT_TYPE_MESSAGES[contractType] ?? UNSUPPORTED_TYPE_MESSAGE;

  const { data: payrollProfile } = usePayrollProfile();
  const breakdown = useMemo(
    () => calculateTerminationBreakdown(employee, data, payrollProfile),
    [employee, data, payrollProfile],
  );
  const autoCalcs = breakdown.items;
  const verbas = breakdown.verbas;
  const fgtsTotal = verbas.fgtsSaldoSalario + verbas.fgtsDecimoTerceiro;

  const proventos = useMemo(() => {
    const items = [
      ...autoCalcs.filter(item => item.isCredit).map(item => ({ desc: item.desc, value: item.value })),
      ...data.manual_adjustments.filter(adj => adj.isCredit).map(adj => ({ desc: adj.description, value: adj.amount })),
    ];
    return { items, total: items.reduce((sum, item) => sum + item.value, 0) };
  }, [autoCalcs, data.manual_adjustments]);

  const deducoes = useMemo(() => {
    const items = [
      ...autoCalcs.filter(item => !item.isCredit).map(item => ({ desc: item.desc, value: item.value })),
      ...data.manual_adjustments.filter(adj => !adj.isCredit).map(adj => ({ desc: adj.description, value: adj.amount })),
    ];
    return { items, total: items.reduce((sum, item) => sum + item.value, 0) };
  }, [autoCalcs, data.manual_adjustments]);

  const valorLiquido = proventos.total - deducoes.total;

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

      {/* CA3 — Sócio: aviso orientativo proeminente */}
      {contractType === 'SOCIO' && (
        <Alert className="border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 dark:text-amber-100">
            <strong>Saída de sócio — nenhum cálculo automático aplicável.</strong>
            <span className="block mt-1">
              A saída deve ser formalizada via <em>Alteração Contratual</em> ou <em>Ata de Reunião</em>
              junto ao cartório / Junta Comercial. O sistema registra a saída e bloqueia o acesso ao usuário.
              Adicione abaixo os valores acordados pelos sócios, se necessário.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Manual adjustments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{contractType === 'PJ' ? 'Valores a Acertar' : 'Ajustes Manuais'}</CardTitle>
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

      {/* Resumo financeiro unificado — Proventos x Deduções x Líquido, estilo TRCT */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Proventos</p>
            {proventos.items.length === 0 && <p className="text-xs text-muted-foreground">Nenhum provento</p>}
            {proventos.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.desc}</span>
                <span className="font-medium text-green-700">{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-1 border-t border-border">
              <span className="font-medium">Total de Proventos</span>
              <span className="font-semibold text-green-700">{formatCurrency(proventos.total)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Deduções</p>
            {deducoes.items.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma dedução</p>}
            {deducoes.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.desc}</span>
                <span className="font-medium text-red-700">{formatCurrency(item.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-1 border-t border-border">
              <span className="font-medium">Total de Deduções</span>
              <span className="font-semibold text-red-700">{formatCurrency(deducoes.total)}</span>
            </div>
          </div>

          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-medium text-foreground">Valor Líquido:</span>
            <span className="font-bold text-lg text-primary">{formatCurrency(valorLiquido)}</span>
          </div>

          {fgtsTotal > 0 && (
            <div className="space-y-1 pt-2 border-t border-border">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                FGTS a depositar (informativo — guia FGTS, não afeta o valor líquido)
              </p>
              {verbas.fgtsSaldoSalario > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FGTS s/ saldo de salário</span>
                  <span className="font-medium">{formatCurrency(verbas.fgtsSaldoSalario)}</span>
                </div>
              )}
              {verbas.fgtsDecimoTerceiro > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FGTS s/ 13º proporcional</span>
                  <span className="font-medium">{formatCurrency(verbas.fgtsDecimoTerceiro)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-1 border-t border-border">
                <span className="font-medium">Total FGTS a depositar</span>
                <span className="font-semibold">{formatCurrency(fgtsTotal)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { calculateAutoCalcs } from '@/lib/terminationCalcs';
export default TerminationStep3Payroll;
