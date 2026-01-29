import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addMonths } from 'date-fns';
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
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { BudgetRolesEditor } from '@/components/budgets/BudgetRolesEditor';
import { BudgetMaterialsEditor } from '@/components/budgets/BudgetMaterialsEditor';
import { BudgetFinancialSummary } from '@/components/budgets/BudgetFinancialSummary';
import { CreateBudgetInput, BudgetRoleInput, BudgetMaterialInput, calculateBudgetTotals } from '@/types/budget';
import { useClients } from '@/hooks/useClients';
import { useActiveRoleRates } from '@/hooks/useRoleRates';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget, useCreateBudget, useUpdateBudget } from '@/hooks/useBudgets';

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

  const [roles, setRoles] = useState<BudgetRoleInput[]>([]);
  const [materials, setMaterials] = useState<BudgetMaterialInput[]>([]);
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  const adminExpensesPercent = financialSettings?.admin_expenses_percent || 0;
  const taxesPercent = financialSettings?.taxes_percent || 0;
  const maxCommissionPercent = financialSettings?.commission_percent || 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      clientType: 'client',
      clientId: '',
      leadName: '',
      leadContact: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      durationMonths: 3,
      validUntil: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const durationMonths = form.watch('durationMonths');
  const clientType = form.watch('clientType');

  const calculation = useMemo(() =>
    calculateBudgetTotals(roles, materials, adminExpensesPercent, taxesPercent, commissionPercent, discountPercent),
    [roles, materials, adminExpensesPercent, taxesPercent, commissionPercent, discountPercent]
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
    }
  }, [budget]);

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
      discountPercent,
      notes: values.notes,
      roles,
      materials,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, input }, { onSuccess: () => navigate('/budgets') });
    } else {
      createMutation.mutate(input, { onSuccess: () => navigate('/budgets') });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="roles">Mão de Obra</TabsTrigger>
              <TabsTrigger value="materials">Materiais</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-6">
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
            </TabsContent>

            <TabsContent value="roles" className="mt-6">
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
            </TabsContent>

            <TabsContent value="materials" className="mt-6">
              <BudgetMaterialsEditor
                materials={materials}
                onMaterialsChange={setMaterials}
              />
            </TabsContent>

            <TabsContent value="financial" className="mt-6">
              <BudgetFinancialSummary
                calculation={calculation}
                adminExpensesPercent={adminExpensesPercent}
                taxesPercent={taxesPercent}
                commissionPercent={commissionPercent}
                maxCommissionPercent={maxCommissionPercent}
                discountPercent={discountPercent}
                onCommissionChange={setCommissionPercent}
                onDiscountChange={setDiscountPercent}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => navigate('/budgets')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Salvar' : 'Criar Orçamento'}
            </Button>
          </div>
        </form>
      </Form>
    </AppLayout>
  );
}
