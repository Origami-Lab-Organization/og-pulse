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
import { Loader2, Save, Plus, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { BudgetRolesEditor } from '@/components/budgets/BudgetRolesEditor';
import { BudgetSuppliersEditor } from '@/components/budgets/BudgetSuppliersEditor';
import { BudgetMaterialsEditor } from '@/components/budgets/BudgetMaterialsEditor';
import { MarginGauge } from '@/components/budgets/MarginGauge';
import { BudgetWizardFooter } from '@/components/budgets/BudgetWizardFooter';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import { CreateBudgetInput, BudgetRoleInput, BudgetMaterialInput, BudgetSupplierInput, BudgetCalculation, RecurringCalculation, SuccessFeeCalculation, calculateBudgetTotals, calculateRecurringTotals, calculateSuccessFeeTotals } from '@/types/budget';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useActiveRoleRates } from '@/hooks/useRoleRates';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget, useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets';
import { useToast } from '@/hooks/use-toast';
import { useLead, useLinkBudgetToLead } from '@/hooks/useLeads';
import { useServices } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { cn } from '@/lib/utils';
import ClientFormDialog from '@/components/clients/ClientFormDialog';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  clientId: z.string().min(1, 'Selecione ou cadastre um cliente'),
  startDate: z.string().optional(),
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
    { id: 2, title: 'Custos do Projeto' },
    { id: 3, title: 'Taxa de Sucesso' },
  ],
  no_revenue: [
    { id: 1, title: 'Dados Básicos' },
    { id: 2, title: 'Equipe Interna' },
  ],
};

function getWizardSteps(billingType: BillingType, isContinuous: boolean) {
  if (billingType === 'no_revenue' && isContinuous) {
    return [
      { id: 1, title: 'Dados do Período' },
      { id: 2, title: 'Equipe Mensal' },
    ];
  }
  return WIZARD_STEPS_BY_TYPE[billingType];
}

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

  // Manual override: set when user changes billing type via selector (no-lead edit/create)
  const [overrideBillingType, setOverrideBillingType] = useState<BillingType | null>(null);
  // Whether the budget uses continuous (monthly) mode — relevant for no_revenue budgets
  const [isContinuous, setIsContinuous] = useState(false);

  const billingType = useMemo<BillingType>(() => {
    // Manual override always wins (user changed the selector)
    if (overrideBillingType) return overrideBillingType;
    // When creating from a lead, derive from lead's service
    if (isFromLead && leadData?.service_line && services.length) {
      const service = services.find(s => s.id === leadData.service_line);
      if (service?.billingType) return service.billingType;
    }
    // When editing an existing budget, derive from billing_type (preferred) or is_recurring flag
    if (isEditing && budget) {
      if (budget.billing_type) return budget.billing_type as BillingType;
      return budget.is_recurring ? 'recurring' : 'fixed_scope';
    }
    return 'fixed_scope';
  }, [overrideBillingType, isFromLead, leadData?.service_line, services, isEditing, budget]);

  const wizardSteps = getWizardSteps(billingType, isContinuous);

  const [currentStep, setCurrentStep] = useState(1);
  const [compositionTab, setCompositionTab] = useState<'roles' | 'suppliers' | 'materials'>('roles');
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
  const [expectedRevenue12m, setExpectedRevenue12m] = useState(0);
  const [plannedCosts, setPlannedCosts] = useState(0);
  const [successFeeType, setSuccessFeeType] = useState<'pontual' | 'continuo'>('pontual');

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
  const watchedTitle = form.watch('title');

  // Guard: new budgets must come from a lead
  useEffect(() => {
    if (!isEditing && !leadId) {
      toast({
        title: 'Aviso',
        description: 'Orçamentos devem ser criados a partir de um lead no CRM',
        variant: 'destructive',
      });
      navigate('/crm');
    }
  }, [isEditing, leadId, navigate, toast]);

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

  const isMonthlyMode = billingType === 'recurring' || (billingType === 'no_revenue' && isContinuous);

  const calculation = useMemo<BudgetCalculation>(() => {
    if (billingType === 'success_fee') {
      return calculateSuccessFeeTotals(roles, materials, suppliers, durationMonths, successFeePercent, expectedRevenue12m, plannedCosts, adminExpensesPercent, taxesPercent);
    }
    // For recurring/continuous modes, BudgetRolesEditor uses a single column (monthlyMode).
    // Expand roles to N months so calculateRecurringTotals receives the correct total hours.
    const expandedRoles = isMonthlyMode
      ? roles.map((r) => ({
          ...r,
          months: Array.from({ length: durationMonths }, (_, i) => ({
            monthNumber: i + 1,
            hours: r.months[0]?.hours ?? 0,
          })),
        }))
      : roles;
    // For no_revenue, all markup percentages are 0 — monthlyCost === monthlySellingPrice
    const args = [expandedRoles, materials, suppliers, durationMonths, adminExpensesPercent, taxesPercent, commissionPercent, netMarginPercent, discountValue] as const;
    return isMonthlyMode
      ? calculateRecurringTotals(...args)
      : calculateBudgetTotals(...args);
  }, [roles, materials, suppliers, durationMonths, adminExpensesPercent, taxesPercent, commissionPercent, netMarginPercent, discountValue, billingType, isContinuous, isMonthlyMode, successFeePercent, expectedRevenue12m, plannedCosts]);

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

      // Detect no_revenue + continuous: is_recurring with no markup percentages and final_total = 0
      if (budget.is_recurring && budget.final_total === 0) {
        setOverrideBillingType('no_revenue');
        setIsContinuous(true);
      }

      // Pre-load success_fee fields
      if (budget.success_fee_percent != null) setSuccessFeePercent(budget.success_fee_percent);
      if (budget.expected_revenue_12m != null) setExpectedRevenue12m(budget.expected_revenue_12m);
      if (budget.planned_costs != null) setPlannedCosts(budget.planned_costs);
      if (budget.success_fee_type) setSuccessFeeType(budget.success_fee_type);
      
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
  // Non-admins can save with pending flag (sends notification to admins); admins must confirm checkbox
  const isSaveBlocked = isMarginBelowMinimum && isAdmin && !marginOverrideConfirmed;

  const sendMarginApprovalNotifications = async (budgetId: string, budgetTitle: string) => {
    try {
      const { data: adminRoles } = await supabase
        .from('user_roles' as any).select('user_id')
        .eq('tenant_id', employee!.tenant_id).eq('role', 'admin');
      if (!adminRoles || (adminRoles as any[]).length === 0) return;
      const adminUserIds = (adminRoles as any[]).map((a: any) => a.user_id);
      const { data: adminEmps } = await supabase
        .from('employees').select('id').in('auth_id', adminUserIds);
      if (!adminEmps || adminEmps.length === 0) return;
      const fmtCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
      const effectiveMargin = calculation.effectiveMarginPercent.toFixed(1);
      const discountDisplay = isMonthlyMode ? fmtCurrency(discountValue) + '/mês' : fmtCurrency(discountValue);
      await supabase.from('notifications' as any).insert(
        (adminEmps as any[]).map((emp: any) => ({
          tenant_id: employee!.tenant_id,
          recipient_id: emp.id,
          type: 'budget_margin_pending',
          category: 'budget',
          priority: 'high',
          action_type: 'approve_reject',
          title: `Desconto aguarda aprovação — ${budgetTitle}`,
          message: `${employee!.nome} aplicou um desconto de ${discountDisplay} que reduz a margem efetiva para ${effectiveMargin}% (mínimo: ${minNetMarginPercent}%). Aprovação necessária.`,
          reference_id: budgetId,
          metadata: {
            budget_title: budgetTitle,
            requester_id: employee!.id,
            requester_name: employee!.nome,
            effective_margin: calculation.effectiveMarginPercent,
            min_margin: minNetMarginPercent,
            discount_value: discountValue,
          },
        })) as any
      );
    } catch (e) {
      console.error('Erro ao enviar notificações de aprovação de margem:', e);
    }
  };
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
        title: 'Confirmação necessária',
        description: `Marque a caixa de aprovação para salvar com margem abaixo do mínimo (${minNetMarginPercent}%).`,
        variant: 'destructive',
      });
      return;
    }

    const isNoRevenue = billingType === 'no_revenue';
    const input: CreateBudgetInput = {
      title: values.title,
      clientId: values.clientId,
      startDate: values.startDate || format(new Date(), 'yyyy-MM-dd'),
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
      marginOverridePending: isMarginBelowMinimum && !isAdmin,
      billingType,
      successFeePercent: billingType === 'success_fee' ? successFeePercent : undefined,
      expectedRevenue12m: billingType === 'success_fee' ? expectedRevenue12m : undefined,
      plannedCosts: billingType === 'success_fee' ? plannedCosts : undefined,
      successFeeType: billingType === 'success_fee' ? successFeeType : undefined,
      monthlyValue: isMonthlyMode ? (calculation as RecurringCalculation).monthlyFinalPrice : undefined,
      isRecurring: isMonthlyMode,
    };

    const needsApprovalNotif = isMarginBelowMinimum && !isAdmin;
    if (isEditing && id) {
      updateMutation.mutate({ id, input }, {
        onSuccess: async () => {
          if (needsApprovalNotif) await sendMarginApprovalNotifications(id, input.title);
          navigate('/budgets');
        },
      });
    } else {
      createMutation.mutate(input, {
        onSuccess: async (data: any) => {
          if (needsApprovalNotif && data?.id) await sendMarginApprovalNotifications(data.id, input.title);
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
      const fields: ('title' | 'clientId' | 'startDate' | 'durationMonths')[] =
        isMonthlyMode
          ? ['title', 'clientId', 'durationMonths']
          : ['title', 'clientId', 'startDate', 'durationMonths'];
      const result = await form.trigger(fields);
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
        breadcrumbs={[{ label: 'CRM', href: '/crm' }, { label: 'Carregando...' }]}
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
            {/* Informative header with title input + type badge */}
            <div className="px-6 pt-5 pb-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    {isEditing ? `Editando: ${budget?.title || ''}` : 'Novo Orçamento'}
                  </p>
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input
                          {...field}
                          placeholder="Nome do orçamento..."
                          className="w-full text-xl font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:outline-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Badge className={cn('text-xs border shrink-0 mt-0.5', TYPE_BADGE_CLASSES[billingType])}>
                  {BILLING_TYPE_LABELS[billingType]}
                </Badge>
              </div>
            </div>

            <CardContent className="pt-5 space-y-4">
              {/* Banner for budgets that predate recurring mode */}
              {isEditing && !budget?.is_recurring && billingType === 'recurring' && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Este orçamento foi criado antes do modo recorrente. Os valores salvos representam o total do contrato. Salve para converter para precificação mensal.
                  </AlertDescription>
                </Alert>
              )}

              {/* Billing type selector — shown when there's no lead context to auto-detect */}
              {!isFromLead && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Orçamento</p>
                  <Select
                    value={billingType}
                    onValueChange={(v) => { setOverrideBillingType(v as BillingType); setIsContinuous(false); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed_scope">Escopo Fixo</SelectItem>
                      <SelectItem value="recurring">Receita Recorrente</SelectItem>
                      <SelectItem value="success_fee">Taxa de Sucesso</SelectItem>
                      <SelectItem value="no_revenue">Interno (sem receita)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Segmented control Pontual/Contínuo — for success_fee */}
              {billingType === 'success_fee' && (
                <div className="space-y-2">
                  <div className="flex rounded-lg bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setSuccessFeeType('pontual')}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-sm font-medium transition-all',
                        successFeeType === 'pontual'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Pontual (Projeto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuccessFeeType('continuo')}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-sm font-medium transition-all',
                        successFeeType === 'continuo'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Contínuo
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {successFeeType === 'continuo'
                      ? 'Acordo de longo prazo com taxa aplicada continuamente'
                      : 'Projeto específico com entrega e taxa de sucesso definidas'}
                  </p>
                </div>
              )}

              {/* Segmented control Pontual/Contínuo — only for no_revenue */}
              {billingType === 'no_revenue' && (
                <div className="space-y-2">
                  <div className="flex rounded-lg bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setIsContinuous(false)}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-sm font-medium transition-all',
                        !isContinuous
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Pontual
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsContinuous(true)}
                      className={cn(
                        'flex-1 rounded-md py-1.5 text-sm font-medium transition-all',
                        isContinuous
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Contínuo
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {isContinuous
                      ? 'Projeto contínuo com custos mensais recorrentes'
                      : 'Projeto com escopo definido e duração fixa'}
                  </p>
                </div>
              )}

              {/* Client + duration layout */}
              {isMonthlyMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.tradingName || c.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button type="button" className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5" onClick={() => setShowClientDialog(true)}>
                        <Plus className="h-3 w-3" />
                        Novo cliente
                      </button>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="durationMonths" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {billingType === 'no_revenue' ? 'Período de planejamento' : 'Duração do Contrato'}
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input type="number" min={1} max={60} {...field} /></FormControl>
                        <span className="text-sm text-muted-foreground shrink-0">meses</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              ) : (
                <>
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
                      <button type="button" className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5" onClick={() => setShowClientDialog(true)}>
                        <Plus className="h-3 w-3" />
                        Novo cliente
                      </button>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data do Orçamento</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="durationMonths" render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {billingType === 'success_fee' ? 'Duração estimada' : 'Duração do Projeto'}
                        </FormLabel>
                        <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring">
                          <FormControl>
                            <Input type="number" min={1} max={60} className="border-0 shadow-none focus-visible:ring-0 min-w-0" {...field} />
                          </FormControl>
                          <span className="pr-3 text-sm text-muted-foreground shrink-0">meses</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </>
              )}

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea placeholder="Notas internas..." {...field} /></FormControl>
                </FormItem>
              )} />
            </CardContent>
          </Card>
        );
      case 2: {
        const recCalc2 = isMonthlyMode ? calculation as RecurringCalculation : null;
        const monthlyLaborCost2 = recCalc2
          ? recCalc2.monthlyCost - suppliers.reduce((a, s) => a + s.monthlyValue, 0) - (durationMonths > 0 ? recCalc2.materialsTotal / durationMonths : 0)
          : 0;

        const compositionTabs = [
          { key: 'roles' as const, label: 'Mão de Obra', count: roles.length },
          { key: 'suppliers' as const, label: 'Fornecedores', count: suppliers.length },
          { key: 'materials' as const, label: 'Materiais', count: materials.length },
        ];

        return (
          <Card className="overflow-hidden">
            {/* Step 2 header */}
            <div className="px-6 pt-5 pb-4 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{watchedTitle || 'Novo Orçamento'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {wizardSteps.find((s) => s.id === 2)?.title}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0 mt-0.5">
                  {billingType === 'no_revenue' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={cn('text-xs border cursor-help', TYPE_BADGE_CLASSES[billingType])}>
                            {BILLING_TYPE_LABELS[billingType]}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-center">
                          {isContinuous
                            ? 'Orçamento interno — custos mensais sem faturamento. Defina a alocação mensal fixa de cada perfil.'
                            : 'Orçamento interno — Este serviço não gera receita. O orçamento serve para controle de custos.'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Badge className={cn('text-xs border', TYPE_BADGE_CLASSES[billingType])}>
                      {BILLING_TYPE_LABELS[billingType]}
                    </Badge>
                  )}
                  {billingType === 'no_revenue' && isContinuous && (
                    <Badge className="text-xs border bg-gray-100 text-gray-600 border-gray-200">Contínuo</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b px-6">
              {compositionTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setCompositionTab(tab.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-1 py-3 mr-6 text-sm font-medium border-b-2 -mb-px transition-colors',
                    compositionTab === tab.key
                      ? 'border-green-600 text-green-700 dark:text-green-500 dark:border-green-500'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <CardContent className="pt-5">
              {compositionTab === 'roles' && (
                <BudgetRolesEditor
                  roles={roles}
                  durationMonths={isMonthlyMode ? 1 : durationMonths}
                  availableRoles={roleRates}
                  onRolesChange={setRoles}
                  monthlyMode={isMonthlyMode}
                />
              )}

              {compositionTab === 'suppliers' && (
                <BudgetSuppliersEditor
                  suppliers={suppliers}
                  durationMonths={durationMonths}
                  onSuppliersChange={setSuppliers}
                  isRecurring={isMonthlyMode}
                />
              )}

              {compositionTab === 'materials' && (
                <BudgetMaterialsEditor
                  materials={materials}
                  onMaterialsChange={setMaterials}
                  isRecurring={isMonthlyMode}
                  durationMonths={durationMonths}
                />
              )}
            </CardContent>

            {/* Planned costs — success_fee only, entered here so Step 3 is purely fee config */}
            {billingType === 'success_fee' && (
              <div className="border-t px-6 py-4 space-y-2">
                <p className="text-sm font-medium">Outros custos do projeto</p>
                <p className="text-xs text-muted-foreground">
                  Custos diretos adicionais não cobertos pela equipe acima (viagens, eventos, licenças etc.)
                </p>
                <div className="flex justify-between items-center pt-1">
                  <Label className="text-sm font-normal">Custos planejados (R$)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <CurrencyInput className="w-40 text-right" value={plannedCosts} onValueChange={(v) => setPlannedCosts(v)} />
                  </div>
                </div>
              </div>
            )}

            {/* Cost summary footer — always visible */}
            <div className="border-t bg-muted/30 px-6 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumo de custos</p>
              {isMonthlyMode && recCalc2 ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mão de obra/mês</span>
                    <span>{formatCurrency(monthlyLaborCost2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fornecedores/mês</span>
                    <span>{formatCurrency(suppliers.reduce((a, s) => a + s.monthlyValue, 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materiais (rateado)</span>
                    <span>{formatCurrency(durationMonths > 0 ? recCalc2.materialsTotal / durationMonths : 0)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Custo mensal</span>
                    <span>{formatCurrency(recCalc2.monthlyCost)}/mês</span>
                  </div>
                  {billingType === 'no_revenue' ? (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Projeção {durationMonths} meses</span>
                      <span>{formatCurrency(recCalc2.contractTotal)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Período: {durationMonths} {durationMonths === 1 ? 'mês' : 'meses'}</span>
                      <span>Total: <strong className="text-foreground">{formatCurrency(recCalc2.contractTotal)}</strong></span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Mão de obra</span>
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
                  {billingType === 'success_fee' && plannedCosts > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Custos planejados</span>
                      <span>{formatCurrency(plannedCosts)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Custo total</span>
                    <span>{formatCurrency(calculation.totalCost)}</span>
                  </div>
                  {billingType === 'no_revenue' && durationMonths > 0 && calculation.totalCost > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Custo mensal médio</span>
                      <span>{formatCurrency(calculation.totalCost / durationMonths)}/mês</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        );
      }
      case 3: {
        const marginAlert = isMarginBelowMinimum && (
          <div className="rounded-lg border border-destructive bg-destructive/5 p-4 space-y-3">
            <p className="text-sm text-destructive font-medium">
              Margem efetiva ({calculation.effectiveMarginPercent.toFixed(1)}%) abaixo do mínimo ({minNetMarginPercent}%).
            </p>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Checkbox id="margin-override" checked={marginOverrideConfirmed} onCheckedChange={(c) => setMarginOverrideConfirmed(c === true)} />
                <label htmlFor="margin-override" className="text-sm cursor-pointer">Aprovar margem abaixo do mínimo configurado</label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ao salvar, uma solicitação de aprovação será enviada automaticamente aos administradores.
              </p>
            )}
          </div>
        );

        const stepHeader = (stepTitle: string) => (
          <div className="px-6 pt-5 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{watchedTitle || 'Novo Orçamento'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stepTitle}</p>
              </div>
              <Badge className={cn('text-xs border shrink-0 mt-0.5', TYPE_BADGE_CLASSES[billingType])}>
                {BILLING_TYPE_LABELS[billingType]}
              </Badge>
            </div>
          </div>
        );

        const markupSection = (isMonthly: boolean) => {
          const recCalc = calculation as RecurringCalculation;
          return (
            <div className="space-y-1">
              <p className="text-sm font-medium mb-3">{isMonthly ? 'Markup mensal' : 'Composição do preço'}</p>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Desp. Administrativas ({adminExpensesPercent}%)</span>
                <span className="text-sm font-medium">
                  {formatCurrency(isMonthly ? recCalc.monthlySellingPrice * adminExpensesPercent / 100 : calculation.adminExpenses)}
                  {isMonthly && <span className="text-xs text-muted-foreground ml-0.5">/mês</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Impostos ({taxesPercent}%)</span>
                <span className="text-sm font-medium">
                  {formatCurrency(isMonthly ? recCalc.monthlySellingPrice * taxesPercent / 100 : calculation.taxes)}
                  {isMonthly && <span className="text-xs text-muted-foreground ml-0.5">/mês</span>}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <Label className="text-sm font-normal">Comissão (máx. {maxCommissionPercent}%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={maxCommissionPercent} step={0.1}
                    className="w-20 h-8 text-right" value={commissionPercent}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => setCommissionPercent(Math.min(parseFloat(e.target.value) || 0, maxCommissionPercent))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm font-medium w-28 text-right">
                    = {formatCurrency(isMonthly ? recCalc.monthlySellingPrice * commissionPercent / 100 : calculation.commission)}
                    {isMonthly && <span className="text-xs text-muted-foreground">/mês</span>}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center py-2">
                <Label className="text-sm font-normal">Margem líquida (mín. {minNetMarginPercent}%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={minNetMarginPercent} max={100} step={0.1}
                    className="w-20 h-8 text-right" value={netMarginPercent}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                    onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setNetMarginPercent(v); }}
                    onBlur={(e) => setNetMarginPercent(Math.max(minNetMarginPercent, Math.min(parseFloat(e.target.value) || minNetMarginPercent, 100)))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <span className="text-sm font-medium w-28 text-right">
                    = {formatCurrency(isMonthly ? recCalc.monthlySellingPrice * netMarginPercent / 100 : calculation.netMargin)}
                    {isMonthly && <span className="text-xs text-muted-foreground">/mês</span>}
                  </span>
                </div>
              </div>
            </div>
          );
        };

        if (billingType === 'success_fee') {
          const sf = calculation as SuccessFeeCalculation;
          const teamCost = sf.laborCost + sf.suppliersTotal + sf.materialsTotal;
          return (
            <Card className="overflow-hidden">
              {stepHeader('Taxa de Sucesso')}
              <CardContent className="pt-5 space-y-6">
                {/* Block 1: Support team costs */}
                <div>
                  <p className="text-sm font-medium mb-3">Custos do projeto</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-xs text-muted-foreground">Mão de Obra</span>
                      <p className="text-base font-semibold mt-1">{formatCurrency(sf.laborCost)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Fornecedores</span>
                      <p className="text-base font-semibold mt-1">{formatCurrency(sf.suppliersTotal)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Materiais</span>
                      <p className="text-base font-semibold mt-1">{formatCurrency(sf.materialsTotal)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-sm font-medium">Subtotal custos</span>
                    <span className="text-base font-semibold">{formatCurrency(teamCost)}</span>
                  </div>
                </div>

                <div className="border-t" />

                {/* Block 2: Fee configuration */}
                <div className="space-y-1">
                  <p className="text-sm font-medium mb-3">Configuração da taxa</p>
                  <p className="text-xs text-muted-foreground mb-3">A receita será calculada como um percentual sobre o faturamento esperado do cliente.</p>
                  <div className="flex justify-between items-center py-2">
                    <Label className="text-sm font-normal">Taxa de Sucesso (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" min={0} max={100} step={0.1}
                        className="w-24 h-8 text-right" value={successFeePercent}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        onChange={(e) => setSuccessFeePercent(Math.min(parseFloat(e.target.value) || 0, 100))}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <Label className="text-sm font-normal">Expectativa de faturamento — {durationMonths} {durationMonths === 1 ? 'mês' : 'meses'} (R$)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <CurrencyInput className="w-40 text-right" value={expectedRevenue12m} onValueChange={(v) => setExpectedRevenue12m(v)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Ex: total de receita gerada, recursos captados ou incentivos fiscais durante os {durationMonths} {durationMonths === 1 ? 'mês' : 'meses'} do projeto.</p>
                </div>

                <div className="border-t" />

                {/* Block 3: Estimated result */}
                <div className="space-y-1">
                  <p className="text-sm font-medium mb-3">Resultado estimado</p>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Faturamento esperado ({durationMonths}m)</span>
                    <span className="text-sm font-medium">{formatCurrency(sf.estimatedBase)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Taxa de sucesso ({sf.successFeePercent}%)</span>
                    <span className="text-sm font-semibold">{formatCurrency(sf.estimatedRevenue)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-muted-foreground">Custos diretos (equipe + planejados)</span>
                    <span className="text-sm text-destructive">- {formatCurrency(sf.totalCost)}</span>
                  </div>
                  {sf.adminExpenses > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-muted-foreground">Desp. Administrativas ({adminExpensesPercent}%)</span>
                      <span className="text-sm text-destructive">- {formatCurrency(sf.adminExpenses)}</span>
                    </div>
                  )}
                  {sf.taxes > 0 && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-sm text-muted-foreground">Impostos ({taxesPercent}%)</span>
                      <span className="text-sm text-destructive">- {formatCurrency(sf.taxes)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4 mt-2">
                    <div>
                      <span className="text-base font-bold">Resultado Estimado</span>
                      {sf.estimatedRevenue > 0 && (
                        <p className="text-xs text-muted-foreground">{sf.estimatedMarginPercent.toFixed(1)}% da receita</p>
                      )}
                    </div>
                    <span className={cn('text-xl font-bold', sf.estimatedMargin >= 0 ? 'text-primary' : 'text-destructive')}>
                      {formatCurrency(sf.estimatedMargin)}
                    </span>
                  </div>
                  {sf.estimatedRevenue === 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Preencha o percentual e a expectativa de faturamento para ver o resultado projetado.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        if (billingType === 'recurring') {
          const rec = calculation as RecurringCalculation;
          const monthlyLaborCost = rec.monthlyCost - suppliers.reduce((a, s) => a + s.monthlyValue, 0) - (durationMonths > 0 ? rec.materialsTotal / durationMonths : 0);
          return (
            <Card className="overflow-hidden">
              {stepHeader(wizardSteps.find((s) => s.id === 3)?.title || 'Valor Mensal')}
              <CardContent className="pt-5 space-y-6">
                {/* Block 1: Monthly costs */}
                <div>
                  <p className="text-sm font-medium mb-3">Custos mensais</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-xs text-muted-foreground">Mão de obra/mês</span>
                      <p className="text-base font-semibold mt-1">{formatCurrency(monthlyLaborCost)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Fornecedores/mês</span>
                      <p className="text-base font-semibold mt-1">{formatCurrency(suppliers.reduce((a, s) => a + s.monthlyValue, 0))}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Implantação rateada</span>
                      <p className="text-base font-semibold mt-1">{formatCurrency(durationMonths > 0 ? rec.materialsTotal / durationMonths : 0)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <span className="text-sm font-medium">Custo mensal total</span>
                    <span className="text-lg font-bold">{formatCurrency(rec.monthlyCost)}</span>
                  </div>
                </div>

                <div className="border-t" />

                {/* Block 2: Markup */}
                {markupSection(true)}

                <div className="border-t" />

                {/* Block 3: Final monthly value */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Preço de venda mensal</span>
                    <span className="text-lg font-semibold">{formatCurrency(rec.monthlySellingPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-normal">Desconto mensal</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <CurrencyInput className="w-32 text-right" value={discountValue} onValueChange={(v) => setDiscountValue(v)} />
                    </div>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Margem efetiva após desconto</span>
                      <span className={cn('font-medium', calculation.effectiveMarginPercent < minNetMarginPercent ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                        {calculation.effectiveMarginPercent.toFixed(1)}%
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
                    <span className="text-xl font-semibold">Valor Mensal Final</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(rec.monthlyFinalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Período: {durationMonths} {durationMonths === 1 ? 'mês' : 'meses'}</span>
                    <span>Total do contrato: <strong className="text-foreground">{formatCurrency(rec.contractTotal)}</strong></span>
                  </div>
                  <MarginGauge effectiveMarginPercent={calculation.effectiveMarginPercent} minMarginPercent={minNetMarginPercent} netMarginPercent={netMarginPercent} />
                  {marginAlert}
                </div>
              </CardContent>
            </Card>
          );
        }

        // fixed_scope
        return (
          <Card className="overflow-hidden">
            {stepHeader(wizardSteps.find((s) => s.id === 3)?.title || 'Precificação')}
            <CardContent className="pt-5 space-y-6">
              {/* Block 1: Total costs */}
              <div>
                <p className="text-sm font-medium mb-3">Custos totais</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-xs text-muted-foreground">Mão de Obra</span>
                    <p className="text-base font-semibold mt-1">{formatCurrency(calculation.laborCost)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Fornecedores</span>
                    <p className="text-base font-semibold mt-1">{formatCurrency(calculation.suppliersTotal)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Materiais</span>
                    <p className="text-base font-semibold mt-1">{formatCurrency(calculation.materialsTotal)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span className="text-sm font-medium">Custo Total</span>
                  <span className="text-lg font-bold">{formatCurrency(calculation.totalCost)}</span>
                </div>
              </div>

              <div className="border-t" />

              {/* Block 2: Markup */}
              {markupSection(false)}

              <div className="border-t" />

              {/* Block 3: Final value */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Preço de Venda</span>
                  <span className="text-lg font-semibold">{formatCurrency(calculation.sellingPrice)}</span>
                </div>
                {durationMonths > 1 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="text-sm">Valor mensal ({durationMonths} meses)</span>
                    <span className="text-sm font-medium">{formatCurrency(calculation.sellingPrice / durationMonths)}/mês</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-normal">Desconto</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <CurrencyInput className="w-32 text-right" value={discountValue} onValueChange={(v) => setDiscountValue(v)} />
                  </div>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Margem efetiva após desconto</span>
                    <span className={cn('font-medium', calculation.effectiveMarginPercent < minNetMarginPercent ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                      {calculation.effectiveMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
                  <span className="text-xl font-semibold">Valor Final</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.finalTotal)}</span>
                </div>
                <MarginGauge effectiveMarginPercent={calculation.effectiveMarginPercent} minMarginPercent={minNetMarginPercent} netMarginPercent={netMarginPercent} />
                {marginAlert}
              </div>
            </CardContent>
          </Card>
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
        { label: 'CRM', href: '/crm' },
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
                <div className="max-w-[720px] mx-auto">{renderStepContent(1)}</div>
              </TabsContent>

              <TabsContent value="composition" className="mt-6">
                <div className="max-w-[720px] mx-auto">{renderStepContent(2)}</div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-6">
                <div className="max-w-[720px] mx-auto">{renderStepContent(3)}</div>
              </TabsContent>
            </Tabs>
          ) : (
            // Creation mode: Use wizard
            <>
              {/* Current step content */}
              <div className="pb-16">
                <div className="max-w-[720px] mx-auto">
                  {renderStepContent(currentStep)}
                </div>
              </div>

              {/* Wizard navigation - fixed footer with inline stepper */}
              <BudgetWizardFooter
                currentStep={currentStep}
                totalSteps={wizardSteps.length}
                wizardSteps={wizardSteps}
                isSubmitting={isSubmitting}
                isSaveDisabled={isSaveBlocked}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onCancel={() => navigate('/crm')}
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
