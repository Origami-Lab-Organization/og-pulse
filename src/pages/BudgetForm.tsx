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
import { Loader2, ArrowLeft, ArrowRight, Save, Check, Calculator, Percent, DollarSign, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { BudgetRolesEditor } from '@/components/budgets/BudgetRolesEditor';
import { BudgetSuppliersEditor } from '@/components/budgets/BudgetSuppliersEditor';
import { BudgetMaterialsEditor } from '@/components/budgets/BudgetMaterialsEditor';
import { BudgetFinancialSummary } from '@/components/budgets/BudgetFinancialSummary';
import { MarginGauge } from '@/components/budgets/MarginGauge';
import { BudgetWizardFooter } from '@/components/budgets/BudgetWizardFooter';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import { CreateBudgetInput, BudgetRoleInput, BudgetMaterialInput, BudgetSupplierInput, calculateBudgetTotals } from '@/types/budget';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { useActiveRoleRates } from '@/hooks/useRoleRates';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget, useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets';
import { useToast } from '@/hooks/use-toast';
import { useLead, useLinkBudgetToLead } from '@/hooks/useLeads';
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

const WIZARD_STEPS = [
  { id: 1, title: 'Dados Básicos' },
  { id: 2, title: 'Composição' },
  { id: 3, title: 'Precificação' },
];

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
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const linkBudgetToLead = useLinkBudgetToLead();
  const isFromLead = !!leadId;

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

  const calculation = useMemo(() =>
    calculateBudgetTotals(
      roles,
      materials,
      suppliers,
      durationMonths,
      adminExpensesPercent,
      taxesPercent,
      commissionPercent,
      netMarginPercent,
      discountValue
    ),
    [roles, materials, suppliers, durationMonths, adminExpensesPercent, taxesPercent, commissionPercent, netMarginPercent, discountValue]
  );

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

  const isMarginBelowMinimum = calculation.effectiveMarginPercent < minNetMarginPercent && discountValue > 0;
  const isAdmin = employee?.isAdmin ?? false;
  const canSaveWithLowMargin = isAdmin && marginOverrideConfirmed;
  const isSaveBlocked = isMarginBelowMinimum && !canSaveWithLowMargin;
  const handleSubmit = (values: FormValues) => {
    if (isSubmitting) {
      console.warn('Form submission blocked: already submitting');
      return;
    }
    
    if (!isEditing && currentStep < WIZARD_STEPS.length) {
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

    const input: CreateBudgetInput = {
      title: values.title,
      clientId: values.clientId,
      startDate: values.startDate,
      durationMonths: values.durationMonths,
      adminExpensesPercent,
      taxesPercent,
      commissionPercent,
      netMarginPercent,
      discountValue,
      notes: values.notes,
      roles,
      materials,
      suppliers,
      marginOverrideApproved: isMarginBelowMinimum && canSaveWithLowMargin,
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
    if (isValid && currentStep < WIZARD_STEPS.length) {
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
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.tradingName || c.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowClientDialog(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
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
                    <FormLabel>Duração do Projeto (meses)</FormLabel>
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

            {/* Rodapé simples com totais */}
            <div className="sticky bottom-0 z-40 -mx-6 -mb-6 border-t bg-muted/50 px-6 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-center gap-8 text-sm">
                <span>Mão de Obra: <strong>{formatCurrency(calculation.laborCost)}</strong></span>
                <span className="text-border">|</span>
                <span>Fornecedores: <strong>{formatCurrency(calculation.suppliersTotal)}</strong></span>
                <span className="text-border">|</span>
                <span>Materiais: <strong>{formatCurrency(calculation.materialsTotal)}</strong></span>
              </div>
            </div>
          </>
        );
      case 3:
        return (
          <div className="space-y-6">
            {/* Card: Custos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Custos
                </CardTitle>
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

            {/* Card: Composição do Preço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Composição do Preço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Despesas Adm - somente leitura */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Despesas Administrativas ({adminExpensesPercent}%)</span>
                  <span>{formatCurrency(calculation.adminExpenses)}</span>
                </div>

                {/* Impostos - somente leitura */}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Impostos ({taxesPercent}%)</span>
                  <span>{formatCurrency(calculation.taxes)}</span>
                </div>

                <Separator />

                {/* Comissão - editável */}
                <div className="flex justify-between items-center">
                  <Label>Comissão (máx. {maxCommissionPercent}%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={maxCommissionPercent}
                      step={0.1}
                      className="w-20 text-right"
                      value={commissionPercent}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setCommissionPercent(Math.min(value, maxCommissionPercent));
                      }}
                    />
                    <span className="text-muted-foreground">%</span>
                    <span className="text-muted-foreground w-28 text-right">= {formatCurrency(calculation.commission)}</span>
                  </div>
                </div>

                {/* Margem - editável */}
                <div className="flex justify-between items-center">
                  <Label>Margem Líquida (mín. {minNetMarginPercent}%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={minNetMarginPercent}
                      max={100}
                      step={0.1}
                      className="w-20 text-right"
                      value={netMarginPercent}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value)) {
                          setNetMarginPercent(value);
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || minNetMarginPercent;
                        setNetMarginPercent(Math.max(minNetMarginPercent, Math.min(value, 100)));
                      }}
                    />
                    <span className="text-muted-foreground">%</span>
                    <span className="text-muted-foreground w-28 text-right">= {formatCurrency(calculation.netMargin)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card: Valor Final */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valor Final
                </CardTitle>
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
                    <CurrencyInput
                      className="w-32 text-right"
                      value={discountValue}
                      onValueChange={(v) => setDiscountValue(v)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center bg-primary/10 rounded-lg p-4">
                  <span className="text-lg font-bold">Valor Final</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.finalTotal)}</span>
                </div>

                <MarginGauge
                  effectiveMarginPercent={calculation.effectiveMarginPercent}
                  minMarginPercent={minNetMarginPercent}
                  netMarginPercent={netMarginPercent}
                />

                {/* Alerta e checkbox de override para admin */}
                {isMarginBelowMinimum && (
                  <div className="rounded-lg border border-destructive bg-destructive/5 p-4 space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      Margem efetiva ({calculation.effectiveMarginPercent.toFixed(1)}%) abaixo do mínimo ({minNetMarginPercent}%).
                      {isAdmin
                        ? ' Como administrador, você pode aprovar esta exceção.'
                        : ' Solicite aprovação ao administrador.'}
                    </p>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="margin-override"
                          checked={marginOverrideConfirmed}
                          onCheckedChange={(checked) => setMarginOverrideConfirmed(checked === true)}
                        />
                        <label htmlFor="margin-override" className="text-sm cursor-pointer">
                          Aprovar margem abaixo do mínimo configurado
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
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
              {/* Wizard step indicator */}
              <div className="flex items-center justify-center mb-8">
                {WIZARD_STEPS.map((step, index) => (
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
                    {index < WIZARD_STEPS.length - 1 && (
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
                totalSteps={WIZARD_STEPS.length}
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
