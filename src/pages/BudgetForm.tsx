import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, ArrowRight, Save, Check } from 'lucide-react';
import { BudgetRolesEditor } from '@/components/budgets/BudgetRolesEditor';
import { BudgetSuppliersEditor } from '@/components/budgets/BudgetSuppliersEditor';
import { BudgetMaterialsEditor } from '@/components/budgets/BudgetMaterialsEditor';
import { BudgetFinancialSummary } from '@/components/budgets/BudgetFinancialSummary';
import { CreateBudgetInput, BudgetRoleInput, BudgetMaterialInput, BudgetSupplierInput, calculateBudgetTotals } from '@/types/budget';
import { useClients } from '@/hooks/useClients';
import { useActiveRoleRates } from '@/hooks/useRoleRates';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget, useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  clientType: z.enum(['client', 'lead']),
  clientId: z.string().optional(),
  leadName: z.string().optional(),
  leadContact: z.string().optional(),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  durationMonths: z.coerce.number().min(1, 'Mínimo 1 mês').max(60, 'Máximo 60 meses'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.clientType === 'client') return !!data.clientId;
  return !!data.leadName;
}, { message: 'Selecione um cliente ou informe o nome do lead', path: ['clientId'] });

type FormValues = z.infer<typeof formSchema>;

const WIZARD_STEPS = [
  { id: 1, title: 'Dados Básicos' },
  { id: 2, title: 'Composição' },
];

export default function BudgetForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: budget, isLoading: budgetLoading } = useBudget(id || null);
  const { data: clients = [] } = useClients();
  const { data: roleRates = [] } = useActiveRoleRates();
  const { data: financialSettings } = useFinancialSettings();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();

  const [currentStep, setCurrentStep] = useState(1);
  const [roles, setRoles] = useState<BudgetRoleInput[]>([]);
  const [materials, setMaterials] = useState<BudgetMaterialInput[]>([]);
  const [suppliers, setSuppliers] = useState<BudgetSupplierInput[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [netMarginPercent, setNetMarginPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [snapshotAdminExpenses, setSnapshotAdminExpenses] = useState(0);
  const [snapshotTaxes, setSnapshotTaxes] = useState(0);
  const [snapshotMaxCommission, setSnapshotMaxCommission] = useState(0);
  const [snapshotMinNetMargin, setSnapshotMinNetMargin] = useState(0);

  // For new budgets, use financial settings. For editing, use budget snapshot.
  const adminExpensesPercent = isEditing && budget ? budget.admin_expenses_percent : (financialSettings?.admin_expenses_percent || 0);
  const taxesPercent = isEditing && budget ? budget.taxes_percent : (financialSettings?.taxes_percent || 0);
  // Max commission: for new budgets use settings, for editing use the stored value as max
  const maxCommissionPercent = isEditing ? snapshotMaxCommission : (financialSettings?.commission_percent || 0);
  // Min net margin: for new budgets use settings, for editing use the stored value as min
  const minNetMarginPercent = isEditing ? snapshotMinNetMargin : (financialSettings?.net_margin_percent || 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      clientType: 'client',
      clientId: '',
      leadName: '',
      leadContact: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      durationMonths: 6,
      validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const durationMonths = form.watch('durationMonths');
  const clientType = form.watch('clientType');
  const startDate = form.watch('startDate');

  // Auto-calculate validity (startDate + 30 days) for new budgets
  useEffect(() => {
    if (!isEditing && startDate) {
      const newValidUntil = format(addDays(new Date(startDate), 30), 'yyyy-MM-dd');
      form.setValue('validUntil', newValidUntil);
    }
  }, [startDate, isEditing, form]);

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
      discountPercent
    ),
    [roles, materials, suppliers, durationMonths, adminExpensesPercent, taxesPercent, commissionPercent, netMarginPercent, discountPercent]
  );

  useEffect(() => {
    if (budget) {
      form.reset({
        title: budget.title,
        clientType: budget.client_id ? 'client' : 'lead',
        clientId: budget.client_id || '',
        leadName: budget.lead_name || '',
        leadContact: budget.lead_contact || '',
        startDate: budget.start_date,
        durationMonths: budget.duration_months,
        validUntil: budget.valid_until || '',
        notes: budget.notes || '',
      });
      setCommissionPercent(budget.commission_percent);
      setDiscountPercent(budget.discount_percent);
      // Use net_margin_percent from budget snapshot (with fallback for old budgets)
      const storedNetMargin = (budget as any).net_margin_percent ?? financialSettings?.net_margin_percent ?? 0;
      setNetMarginPercent(storedNetMargin);
      // Store snapshot limits for editing
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
    } else if (financialSettings) {
      // For new budgets, initialize with settings values
      setNetMarginPercent(financialSettings.net_margin_percent);
    }
  }, [budget, financialSettings]);

  const handleSubmit = (values: FormValues) => {
    const input: CreateBudgetInput = {
      title: values.title,
      validUntil: values.validUntil || undefined,
      clientId: values.clientType === 'client' ? values.clientId : undefined,
      leadName: values.clientType === 'lead' ? values.leadName : undefined,
      leadContact: values.clientType === 'lead' ? values.leadContact : undefined,
      startDate: values.startDate,
      durationMonths: values.durationMonths,
      adminExpensesPercent,
      taxesPercent,
      commissionPercent,
      netMarginPercent,
      discountPercent,
      notes: values.notes,
      roles,
      materials,
      suppliers,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => navigate('/budgets') });
    } else {
      createMutation.mutate(input, { onSuccess: () => navigate('/budgets') });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const validateCurrentStep = async (): Promise<boolean> => {
    if (currentStep === 1) {
      const result = await form.trigger(['title', 'clientType', 'clientId', 'leadName', 'startDate', 'durationMonths']);
      return result;
    }
    return true;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
              <FormField control={form.control} name="clientType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cliente</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="client" id="client" />
                        <Label htmlFor="client">Cliente Existente</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lead" id="lead" />
                        <Label htmlFor="lead">Novo Lead</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Orçamento</FormLabel>
                  <FormControl><Input placeholder="Ex: Projeto Website Corporativo" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {clientType === 'client' ? (
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
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="leadName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Lead</FormLabel>
                      <FormControl><Input placeholder="Nome da empresa ou pessoa" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="leadContact" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contato</FormLabel>
                      <FormControl><Input placeholder="Email ou telefone" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="durationMonths" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (meses)</FormLabel>
                    <FormControl><Input type="number" min={1} max={60} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="validUntil" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido até</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna principal: Seções de custos */}
            <div className="lg:col-span-2 space-y-6">
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

            {/* Coluna lateral: Resumo sempre visível */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <BudgetFinancialSummary
                  calculation={calculation}
                  adminExpensesPercent={adminExpensesPercent}
                  taxesPercent={taxesPercent}
                  commissionPercent={commissionPercent}
                  maxCommissionPercent={maxCommissionPercent}
                  netMarginPercent={netMarginPercent}
                  minNetMarginPercent={minNetMarginPercent}
                  discountPercent={discountPercent}
                  onCommissionChange={(val) => setCommissionPercent(Math.max(0, Math.min(val, maxCommissionPercent)))}
                  onNetMarginChange={(val) => setNetMarginPercent(Math.max(minNetMarginPercent, Math.min(val, 100)))}
                  onDiscountChange={setDiscountPercent}
                />
              </div>
            </div>
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
        { label: 'Orçamentos', href: '/budgets' },
        { label: isEditing ? 'Editar' : 'Novo' },
      ]}
      actions={
        <Button variant="outline" onClick={() => navigate('/budgets')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {isEditing ? (
            // Editing mode: Use tabs
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="roles">Mão de Obra</TabsTrigger>
                <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
                <TabsTrigger value="materials">Materiais</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-6">
                {renderStepContent(1)}
              </TabsContent>

              <TabsContent value="roles" className="mt-6">
                {renderStepContent(2)}
              </TabsContent>

              <TabsContent value="suppliers" className="mt-6">
                {renderStepContent(3)}
              </TabsContent>

              <TabsContent value="materials" className="mt-6">
                {renderStepContent(4)}
              </TabsContent>

              <TabsContent value="financial" className="mt-6">
                {renderStepContent(5)}
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
              <div className="mt-6">
                {renderStepContent(currentStep)}
              </div>

              {/* Wizard navigation */}
              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>

                {currentStep < WIZARD_STEPS.length ? (
                  <Button type="button" onClick={handleNext}>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Criar Orçamento
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Edit mode: Single submit button */}
          {isEditing && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/budgets')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          )}
        </form>
      </Form>
    </AppLayout>
  );
}
