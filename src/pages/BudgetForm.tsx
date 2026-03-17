import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, ArrowRight, Save, Check, Calculator, Percent, DollarSign, Plus, TrendingUp, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { BudgetRolesEditor } from '@/components/budgets/BudgetRolesEditor';
import { BudgetSuppliersEditor } from '@/components/budgets/BudgetSuppliersEditor';
import { BudgetMaterialsEditor } from '@/components/budgets/BudgetMaterialsEditor';
import { BudgetFinancialSummary } from '@/components/budgets/BudgetFinancialSummary';
import { MarginGauge } from '@/components/budgets/MarginGauge';
import { BudgetWizardFooter } from '@/components/budgets/BudgetWizardFooter';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import { CreateBudgetInput, BudgetRoleInput, BudgetMaterialInput, BudgetSupplierInput, BudgetCalculation, RecurringCalculation, SuccessFeeCalculation, calculateBudgetTotals, calculateRecurringTotals, calculateSuccessFeeTotals } from '@/types/budget';
import { Badge } from '@/components/ui/badge';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useActiveRoleRates } from '@/hooks/useRoleRates';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget, useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets';
import { useToast } from '@/hooks/use-toast';
import { useLead, useLinkBudgetToLead } from '@/hooks/useLeads';
import { useServices } from '@/hooks/useServices';
import { BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { cn } from '@/lib/utils';
import ClientFormDialog from '@/components/clients/ClientFormDialog';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  clientId: z.string().min(1, 'Selecione ou cadastre um cliente'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  durationMonths: z.coerce.number().min(1, 'Mínimo 1 mês').max(60, 'Máximo 60 meses'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const WIZARD_STEPS_BY_TYPE: Record<BillingType, { id: number; title: string }[]> = {
  fixed_scope: [
    { id: 1, title: 'Dados Básicos' },
    { id: 2, title: 'Composição' },
    { id: 3, title: 'Precificação' },
  ],
  recurring: [
    { id: 1, title: 'Dados do Contrato' },
    { id: 2, title: 'Equipe Mensal' },
    { id: 3, title: 'Valor Mensal' },
  ],
  success_fee: [
    { id: 1, title: 'Dados Básicos' },
    { id: 2, title: 'Equipe de Apoio' },
    { id: 3, title: 'Taxa de Sucesso' },
  ],
  no_revenue: [
    { id: 1, title: 'Dados Básicos' },
    { id: 2, title: 'Equipe Interna' },
  ],
};

const TYPE_BADGE_CLASSES: Record<BillingType, string> = {
  fixed_scope: 'bg-green-100 text-green-800 border-green-200',
  recurring: 'bg-blue-100 text-blue-800 border-blue-200',
  success_fee: 'bg-amber-100 text-amber-800 border-amber-200',
  no_revenue: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function BudgetForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get('leadId');
  const isEditing = !!id;
  const createClientMutation = useCreateClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  const { data: budget, isLoading: budgetLoading } = useBudget(id || null);
  const { data: clients = [] } = useClients();
  const { data: roleRates = [] } = useActiveRoleRates();
  const { data: financialSettings } = useFinancialSettings();
  const { data: leadData } = useLead(leadId);
  const { data: services = [] } = useServices();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const linkBudgetToLead = useLinkBudgetToLead();
  const isFromLead = !!leadId;

  const billingType = useMemo<BillingType>(() => {
    if (!leadData?.service_line || !services.length) return 'fixed_scope';
    const service = services.find(s => s.id === leadData.service_line);
    return service?.billingType ?? 'fixed_scope';
  }, [leadData?.service_line, services]);

  const wizardSteps = WIZARD_STEPS_BY_TYPE[billingType];

  const [currentStep, setCurrentStep] = useState(1);
  const [roles, setRoles] = useState<BudgetRoleInput[]>([]);
  const [materials, setMaterials] = useState<BudgetMaterialInput[]>([]);
  const [suppliers, setSuppliers] = useState<BudgetSupplierInput[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [netMarginPercent, setNetMarginPercent] = useState(0);
  const [discountValue, setDiscountValue] = useState(0);
  const [snapshotAdminExpenses, setSnapshotAdminExpenses] = useState(0);
  const [snapshotTaxes, setSnapshotTaxes] = useState(0);
  const [snapshotMaxCommission, setSnapshotMaxCommission] = useState(0);
  const [snapshotMinNetMargin, setSnapshotMinNetMargin] = useState(0);
  const [marginOverrideConfirmed, setMarginOverrideConfirmed] = useState(false);
  const [successFeePercent, setSuccessFeePercent] = useState(0);
  const [estimatedBase, setEstimatedBase] = useState(0);

  // For new budgets, use financial settings. For editing, use budget snapshot.
  const adminExpensesPercent = isEditing && budget ? budget.admin_expenses_percent : (financialSettings?.admin_expenses_percent || 0);
  const taxesPercent = isEditing && budget ? budget.taxes_percent : (financialSettings?.taxes_percent || 0);
  // Always use current financial settings for constraints
  const maxCommissionPercent = financialSettings?.commission_percent || 0;
  const minNetMarginPercent = financialSettings?.net_margin_percent || 0;

  const [showClientDialog, setShowClientDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      clientId: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      durationMonths: 6,
      notes: '',
    },
  });

  const durationMonths = form.watch('durationMonths');

  // Pre-fill from lead data
  useEffect(() => {
    if (leadData && !isEditing) {
      form.setValue('title', leadData.name);
      if (leadData.client_id) {
        form.setValue('clientId', leadData.client_id);
      }
    }
  }, [leadData, isEditing, form]);

  // Pre-fill successFeePercent from service defaultValue when available
  useEffect(() => {
    if (billingType === 'success_fee' && leadData?.service_line && services.length) {
      const service = services.find(s => s.id === leadData.service_line);
      if (service?.billingUnit === '%' && service.defaultValue != null) {
        setSuccessFeePercent(service.defaultValue);
      }
    }
  }, [billingType, leadData?.service_line, services]);

  const calculation = useMemo<BudgetCalculation>(() => {
    if (billingType === 'success_fee') {
      return calculateSuccessFeeTotals(roles, materials, suppliers, durationMonths, successFeePercent, estimatedBase);
    }
    const args = [roles, materials, suppliers, durationMonths, adminExpensesPercent, taxesPercent, commissionPercent, netMarginPercent, discountValue] as const;
    return billingType === 'recurring'
      ? calculateRecurringTotals(...args)
      : calculateBudgetTotals(...args);
  }, [roles, materials, suppliers, durationMonths, adminExpensesPercent, taxesPercent, commissionPercent, netMarginPercent, discountValue, billingType, successFeePercent, estimatedBase]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (budget && !initializedRef.current) {
      initializedRef.current = true;
      form.reset({
        title: budget.title,
        clientId: budget.client_id || '',
        startDate: budget.start_date,
        durationMonths: budget.duration_months,
        notes: budget.notes || '',
      });
      setCommissionPercent(budget.commission_percent);
      setDiscountValue((budget as any).discount_value ?? 0);
      const storedNetMargin = (budget as any).net_margin_percent ?? financialSettings?.net_margin_percent ?? 0;
      setNetMarginPercent(storedNetMargin);
      setSnapshotAdminExpenses(budget.admin_expenses_percent);
      setSnapshotTaxes(budget.taxes_percent);
      setSnapshotMaxCommission(budget.commission_percent);
      setSnapshotMinNetMargin(storedNetMargin);
      
      setRoles(budget.roles.map((r) => ({
        tempId: crypto.randomUUID(),
        roleRateId: r.role_rate_id || '',
        roleName: r.role_name,
        seniority: r.seniority,
        hourlyRate: r.hourly_rate,
        months: r.months.map((m) => ({ monthNumber: m.month_number, hours: m.hours })),
      })));
      setMaterials(budget.materials?.map((m) => ({
        tempId: crypto.randomUUID(),
        description: m.description,
        value: m.value,
      })) || []);
      setSuppliers((budget.suppliers || []).map((s) => ({
        tempId: crypto.randomUUID(),
        name: s.name,
        description: s.description || '',
        monthlyValue: s.monthly_value,
      })));
    } else if (!budget && financialSettings && !initializedRef.current) {
      initializedRef.current = true;
      setNetMarginPercent(financialSettings.net_margin_percent);
    }
  }, [budget, financialSettings]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const isMarginBelowMinimum = billingType !== 'no_revenue' && billingType !== 'success_fee' && calculation.effectiveMarginPercent < minNetMarginPercent && discountValue > 0;
  const isAdmin = employee?.isAdmin ?? false;
  const canSaveWithLowMargin = isAdmin && marginOverrideConfirmed;
  const isSaveBlocked = isMarginBelowMinimum && !canSaveWithLowMargin;
  const handleSubmit = (values: FormValues) => {
    if (isSubmitting) {
      console.warn('Form submission blocked: already submitting');
      return;
    }
    
    if (!isEditing && currentStep < wizardSteps.length) {
      console.warn('Form submission blocked: not on final step');
      return;
    }

    if (isSaveBlocked) {
      toast({
        title: 'Margem abaixo do mínimo',
        description: `A margem efetiva (${calculation.effectiveMarginPercent.toFixed(1)}%) está abaixo do mínimo (${minNetMarginPercent}%). Requer aprovação do administrador.`,
        variant: 'destructive',
      });
      return;
    }

    const isNoRevenue = billingType === 'no_revenue';
    const input: CreateBudgetInput = {
      title: values.title,
      clientId: values.clientId,
      startDate: values.startDate,
      durationMonths: values.durationMonths,
      adminExpensesPercent: isNoRevenue ? 0 : adminExpensesPercent,
      taxesPercent: isNoRevenue ? 0 : taxesPercent,
      commissionPercent: isNoRevenue ? 0 : commissionPercent,
      netMarginPercent: isNoRevenue ? 0 : netMarginPercent,
      // For recurring, discountValue state is monthly — save total to DB. For success_fee/no_revenue, no discount.
      discountValue: (billingType === 'success_fee' || isNoRevenue) ? 0 : billingType === 'recurring' ? discountValue * values.durationMonths : discountValue,
      notes: values.notes,
      roles,
      materials,
      suppliers,
      marginOverrideApproved: isMarginBelowMinimum && canSaveWithLowMargin,
      billingType,
      successFeePercent: billingType === 'success_fee' ? successFeePercent : undefined,
      estimatedBase: billingType === 'success_fee' ? estimatedBase : undefined,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => navigate('/budgets') });
    } else {
      createMutation.mutate(input, {
        onSuccess: (data: any) => {
          if (isFromLead && leadId && data?.id) {
            linkBudgetToLead.mutate(
              { leadId, budgetId: data.id },
              { onSuccess: () => navigate('/crm') }
            );
          } else {
            navigate('/budgets');
          }
        },
      });
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    if (currentStep === 1) {
      const result = await form.trigger(['title', 'clientId', 'startDate', 'durationMonths']);
      return result;
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < wizardSteps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isEditing && budgetLoading) {
    return (
      <AppLayout
        title="Carregando..."
        breadcrumbs={[{ label: 'Orçamentos', href: '/budgets' }, { label: 'Carregando...' }]}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Block editing of active (closed) budgets
  if (isEditing && budget && budget.status === 'active') {
    navigate(`/budgets/${id}`);
    return null;
  }

  // Render wizard step content
  const renderStepContent = (step: number) => {
    switch (step) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Informações do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Orçamento</FormLabel>
                  <FormControl><Input placeholder="Ex: Projeto Website Corporativo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.tradingName || c.companyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" className="w-full mt-1" onClick={() => setShowClientDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cliente
                  </Button>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {billingType === 'recurring'
                        ? 'Período até renovação (meses)'
                        : billingType === 'success_fee'
                        ? 'Duração estimada (meses)'
                        : 'Duração do Projeto (meses)'}
                    </FormLabel>
                    {billingType === 'recurring' && (
                      <p className="text-xs text-muted-foreground -mt-1">Data de renovação: {
                        form.watch('startDate')
                          ? format(new Date(new Date(form.watch('startDate')).setMonth(new Date(form.watch('startDate')).getMonth() + Number(field.value || 0))), 'dd/MM/yyyy')
                          : '—'
                      }</p>
                    )}
                    {billingType === 'success_fee' && (
                      <p className="text-xs text-muted-foreground -mt-1">Estimativa para alocação de equipe de apoio</p>
                    )}
                    <FormControl><Input type="number" min={1} max={60} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea placeholder="Notas internas..." {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <>
            {billingType === 'no_revenue' && (
              <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Orçamento interno — Este serviço não gera receita. O orçamento serve para controle de custos.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col space-y-6">
              {/* Mão de Obra */}
              <Card>
                <CardContent className="pt-6">
                  <BudgetRolesEditor
                    roles={roles}
                    durationMonths={durationMonths}
                    availableRoles={roleRates}
                    onRolesChange={setRoles}
                  />
                </CardContent>
              </Card>

              {/* Fornecedores */}
              <BudgetSuppliersEditor
                suppliers={suppliers}
                durationMonths={durationMonths}
                onSuppliersChange={setSuppliers}
              />

              {/* Materiais */}
              <BudgetMaterialsEditor
                materials={materials}
                onMaterialsChange={setMaterials}
              />
            </div>

            {billingType === 'no_revenue' ? (
              /* Budget interno: resumo de custo inline */
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" />
                    Budget Interno
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo de mão de obra</span>
                    <span>{formatCurrency(calculation.laborCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fornecedores</span>
                    <span>{formatCurrency(calculation.suppliersTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materiais</span>
                    <span>{formatCurrency(calculation.materialsTotal)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Custo total estimado</span>
                    <span className="text-lg">{formatCurrency(calculation.totalCost)}</span>
                  </div>
                  {durationMonths > 0 && calculation.totalCost > 0 && (
                    <p className="text-xs text-muted-foreground text-right">
                      {formatCurrency(calculation.totalCost)} / {durationMonths} {durationMonths === 1 ? 'mês' : 'meses'} = <strong>{formatCurrency(calculation.totalCost / durationMonths)}/mês</strong>
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Rodapé simples com totais para outros tipos */
              <div className="sticky bottom-0 z-40 -mx-6 -mb-6 border-t bg-muted/50 px-6 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-center gap-8 text-sm">
                  <span>Mão de Obra: <strong>{formatCurrency(calculation.laborCost)}</strong></span>
                  <span className="text-border">|</span>
                  <span>Fornecedores: <strong>{formatCurrency(calculation.suppliersTotal)}</strong></span>
                  <span className="text-border">|</span>
                  <span>Materiais: <strong>{formatCurrency(calculation.materialsTotal)}</strong></span>
                </div>
              </div>
            )}
          </>
        );
      case 3: {
        // Shared markup controls (used by both layouts)
        const markupControls = (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                {billingType === 'recurring' ? 'Markup Mensal' : 'Composição do Preço'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Despesas Administrativas ({adminExpensesPercent}%)</span>
                <span>{formatCurrency(billingType === 'recurring' ? (calculation as RecurringCalculation).monthlySellingPrice * adminExpensesPercent / 100 : calculation.adminExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Impostos ({taxesPercent}%)</span>
                <span>{formatCurrency(billingType === 'recurring' ? (calculation as RecurringCalculation).monthlySellingPrice * taxesPercent / 100 : calculation.taxes)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <Label>Comissão (máx. {maxCommissionPercent}%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={maxCommissionPercent} step={0.1}
                    className="w-20 text-right" value={commissionPercent}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setCommissionPercent(Math.min(parseFloat(e.target.value) || 0, maxCommissionPercent))}
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="text-muted-foreground w-28 text-right">
                    = {formatCurrency(billingType === 'recurring' ? (calculation as RecurringCalculation).monthlySellingPrice * commissionPercent / 100 : calculation.commission)}
                    {billingType === 'recurring' && <span className="text-xs">/mês</span>}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Label>Margem Líquida (mín. {minNetMarginPercent}%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={minNetMarginPercent} max={100} step={0.1}
                    className="w-20 text-right" value={netMarginPercent}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setNetMarginPercent(v); }}
                    onBlur={(e) => setNetMarginPercent(Math.max(minNetMarginPercent, Math.min(parseFloat(e.target.value) || minNetMarginPercent, 100)))}
                  />
                  <span className="text-muted-foreground">%</span>
                  <span className="text-muted-foreground w-28 text-right">
                    = {formatCurrency(billingType === 'recurring' ? (calculation as RecurringCalculation).monthlySellingPrice * netMarginPercent / 100 : calculation.netMargin)}
                    {billingType === 'recurring' && <span className="text-xs">/mês</span>}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

        const marginAlert = isMarginBelowMinimum && (
          <div className="rounded-lg border border-destructive bg-destructive/5 p-4 space-y-3">
            <p className="text-sm text-destructive font-medium">
              Margem efetiva ({calculation.effectiveMarginPercent.toFixed(1)}%) abaixo do mínimo ({minNetMarginPercent}%).
              {isAdmin ? ' Como administrador, você pode aprovar esta exceção.' : ' Solicite aprovação ao administrador.'}
            </p>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Checkbox id="margin-override" checked={marginOverrideConfirmed} onCheckedChange={(c) => setMarginOverrideConfirmed(c === true)} />
                <label htmlFor="margin-override" className="text-sm cursor-pointer">Aprovar margem abaixo do mínimo configurado</label>
              </div>
            )}
          </div>
        );

        if (billingType === 'success_fee') {
          const sf = calculation as SuccessFeeCalculation;
          return (
            <div className="space-y-6">
              {/* Custos da equipe de apoio */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Custos da Equipe de Apoio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Mão de Obra</span>
                      <p className="text-lg font-semibold">{formatCurrency(sf.laborCost)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Fornecedores</span>
                      <p className="text-lg font-semibold">{formatCurrency(sf.suppliersTotal)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Materiais</span>
                      <p className="text-lg font-semibold">{formatCurrency(sf.materialsTotal)}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Custo Total</span>
                    <span className="text-xl font-bold">{formatCurrency(sf.totalCost)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Configuração da Taxa de Sucesso */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" />Taxa de Sucesso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    A receita será calculada como um percentual sobre o resultado obtido para o cliente.
                  </p>
                  <div className="flex justify-between items-center">
                    <Label>Percentual da taxa (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100} step={0.1}
                        className="w-24 text-right" value={successFeePercent}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        onChange={(e) => setSuccessFeePercent(Math.min(parseFloat(e.target.value) || 0, 100))}
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label>Base estimada (R$)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">R$</span>
                      <CurrencyInput className="w-40 text-right" value={estimatedBase} onValueChange={(v) => setEstimatedBase(v)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ex: valor do contrato do cliente, recursos captados, incentivos fiscais obtidos.
                  </p>
                </CardContent>
              </Card>

              {/* Resultado Estimado */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Resultado Estimado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Base estimada</span>
                    <span>{formatCurrency(sf.estimatedBase)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Taxa de sucesso ({sf.successFeePercent}%)</span>
                    <span className="text-lg font-semibold">{formatCurrency(sf.estimatedRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Custos de apoio</span>
                    <span className="text-destructive">- {formatCurrency(sf.totalCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
                    <div>
                      <span className="text-lg font-bold">Margem Estimada</span>
                      {sf.estimatedRevenue > 0 && (
                        <p className="text-sm text-muted-foreground">{sf.estimatedMarginPercent.toFixed(1)}% da receita</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-2xl font-bold',
                      sf.estimatedMargin >= 0 ? 'text-primary' : 'text-destructive'
                    )}>
                      {formatCurrency(sf.estimatedMargin)}
                    </span>
                  </div>
                  {sf.estimatedRevenue === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Preencha o percentual e a base estimada para ver o resultado projetado.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        }

        if (billingType === 'recurring') {
          const rec = calculation as RecurringCalculation;
          return (
            <div className="space-y-6">
              {/* Custos Mensais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Custos Mensais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Mão de obra/mês</span>
                      <p className="text-lg font-semibold">{formatCurrency(rec.monthlyCost - (suppliers.reduce((a, s) => a + s.monthlyValue, 0)) - (durationMonths > 0 ? rec.materialsTotal / durationMonths : 0))}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Fornecedores/mês</span>
                      <p className="text-lg font-semibold">{formatCurrency(suppliers.reduce((a, s) => a + s.monthlyValue, 0))}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Materiais (rateado)</span>
                      <p className="text-lg font-semibold">{formatCurrency(durationMonths > 0 ? rec.materialsTotal / durationMonths : 0)}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Custo mensal total</span>
                    <span className="text-xl font-bold">{formatCurrency(rec.monthlyCost)}</span>
                  </div>
                </CardContent>
              </Card>

              {markupControls}

              {/* Valor Mensal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Valor Mensal</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Preço de venda mensal</span>
                    <span className="text-xl font-semibold">{formatCurrency(rec.monthlySellingPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label>Desconto mensal</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">R$</span>
                      <CurrencyInput className="w-32 text-right" value={discountValue} onValueChange={(v) => setDiscountValue(v)} />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
                    <span className="text-lg font-bold">Valor Mensal Final</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(rec.monthlyFinalPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Período: {durationMonths} {durationMonths === 1 ? 'mês' : 'meses'}</span>
                    <span>Total do contrato: <strong className="text-foreground">{formatCurrency(rec.contractTotal)}</strong></span>
                  </div>
                  <MarginGauge effectiveMarginPercent={calculation.effectiveMarginPercent} minMarginPercent={minNetMarginPercent} netMarginPercent={netMarginPercent} />
                  {marginAlert}
                </CardContent>
              </Card>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {/* Card: Custos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Custos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-sm text-muted-foreground">Mão de Obra</span>
                    <p className="text-lg font-semibold">{formatCurrency(calculation.laborCost)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Fornecedores</span>
                    <p className="text-lg font-semibold">{formatCurrency(calculation.suppliersTotal)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Materiais</span>
                    <p className="text-lg font-semibold">{formatCurrency(calculation.materialsTotal)}</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Custo Total</span>
                  <span className="text-xl font-bold">{formatCurrency(calculation.totalCost)}</span>
                </div>
              </CardContent>
            </Card>

            {markupControls}

            {/* Card: Valor Final */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Valor Final</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Preço de Venda</span>
                  <span className="text-xl font-semibold">{formatCurrency(calculation.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <Label>Desconto</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">R$</span>
                    <CurrencyInput className="w-32 text-right" value={discountValue} onValueChange={(v) => setDiscountValue(v)} />
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
                  <span className="text-lg font-bold">Valor Final</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.finalTotal)}</span>
                </div>
                <MarginGauge effectiveMarginPercent={calculation.effectiveMarginPercent} minMarginPercent={minNetMarginPercent} netMarginPercent={netMarginPercent} />
                {marginAlert}
              </CardContent>
            </Card>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <AppLayout
      title={isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}
      description={isEditing ? `Editando: ${budget?.title}` : 'Crie uma nova proposta comercial'}
      breadcrumbs={[
        { label: isFromLead ? 'CRM' : 'Orçamentos', href: isFromLead ? '/crm' : '/budgets' },
        { label: isEditing ? 'Editar' : 'Novo' },
      ]}
    >
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {isEditing ? (
            // Editing mode: Use tabs
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="composition">Composição</TabsTrigger>
                <TabsTrigger value="pricing">Precificação</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-6">
                {renderStepContent(1)}
              </TabsContent>

              <TabsContent value="composition" className="mt-6">
                {renderStepContent(2)}
              </TabsContent>

              <TabsContent value="pricing" className="mt-6">
                {renderStepContent(3)}
              </TabsContent>
            </Tabs>
          ) : (
            // Creation mode: Use wizard
            <>
              {/* Service type badge */}
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn('text-xs border', TYPE_BADGE_CLASSES[billingType])}>
                  {BILLING_TYPE_LABELS[billingType]}
                </Badge>
              </div>

              {/* Wizard step indicator */}
              <div className="flex items-center justify-center mb-8">
                {wizardSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium transition-colors",
                        currentStep === step.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : currentStep > step.id
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-muted bg-muted text-muted-foreground"
                      )}
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={cn(
                        "ml-2 text-sm font-medium hidden sm:inline",
                        currentStep === step.id
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    {index < wizardSteps.length - 1 && (
                      <div
                        className={cn(
                          "w-8 h-0.5 mx-2 sm:w-12 lg:w-16",
                          currentStep > step.id ? "bg-primary" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Current step content */}
              <div className="mt-6 pb-16">
                {renderStepContent(currentStep)}
              </div>

              {/* Wizard navigation - fixed footer */}
              <BudgetWizardFooter
                currentStep={currentStep}
                totalSteps={wizardSteps.length}
                isSubmitting={isSubmitting}
                isSaveDisabled={isSaveBlocked}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onCancel={() => navigate(isFromLead ? '/crm' : '/budgets')}
                onSubmit={() => form.handleSubmit(handleSubmit, (errors) => {
                  console.error('Form validation errors:', errors);
                  toast({
                    title: 'Erro de validação',
                    description: 'Verifique os campos obrigatórios no passo 1.',
                    variant: 'destructive',
                  });
                })()}
              />
            </>
          )}

          {/* Edit mode: Single submit button */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/budgets')}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => form.handleSubmit(handleSubmit, (errors) => {
                console.error('Form validation errors:', errors);
                toast({
                  title: 'Erro de validação',
                  description: 'Verifique os campos obrigatórios.',
                  variant: 'destructive',
                });
              })()} disabled={isSubmitting || isSaveBlocked}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          )}
        </form>
      </Form>

      <ClientFormDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onSubmit={(data) => {
          createClientMutation.mutate(data, {
            onSuccess: (newClient) => {
              form.setValue('clientId', newClient.id);
              setShowClientDialog(false);
            },
          });
        }}
        isLoading={createClientMutation.isPending}
      />
    </AppLayout>
  );
}
