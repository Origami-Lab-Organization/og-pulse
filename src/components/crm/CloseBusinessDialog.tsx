import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BudgetWithDetails } from '@/types/budget';
import { LeadWithBudget } from '@/types/lead';
import { Service } from '@/types/service';
import {
  PAYMENT_METHOD_OPTIONS,
  ProjectType,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPE_DESCRIPTIONS,
} from '@/types/project';
import { useEmployees } from '@/hooks/useEmployees';
import { useClients } from '@/hooks/useClients';
import { formatCurrency as formatCurrencyValue } from '@/lib/formatters';
import {
  Briefcase,
  Calendar,
  DollarSign,
  User,
  Building2,
  Target,
  RefreshCw,
  Trophy,
  Eye,
  Lock,
  AlertTriangle,
  LucideIcon,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { cn } from '@/lib/utils';

const PROJECT_TYPE_ICONS: Record<ProjectType, LucideIcon> = {
  fixed_scope: Target,
  continuous: RefreshCw,
  success_fee: Trophy,
  non_revenue: Eye,
};

const closeBusinessSchema = z.object({
  projectType: z.enum(['fixed_scope', 'continuous', 'success_fee', 'non_revenue']).default('fixed_scope'),
  managerId: z.string().min(1, 'Gerente é obrigatório'),
  paymentMethod: z.string().default('mensal'),
  installmentsCount: z.coerce.number().min(1).default(1),
  dueDay: z.coerce.number().min(1).max(31).default(10),
  dueDate: z.string().optional().default(''),
  firstInvoiceDate: z.string().optional().default(''),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional().default(''),
  renewalDate: z.string().optional().default(''),
  successFeePercent: z.coerce.number().min(0).max(100).optional(),
  // Fields for no-budget mode
  projectName: z.string().optional(),
  clientId: z.string().optional(),
  totalValue: z.coerce.number().optional(),
  monthlyValue: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.projectType === 'success_fee' && !data.successFeePercent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '% de Sucesso é obrigatória para projetos de taxa de sucesso',
      path: ['successFeePercent'],
    });
  }
  if (data.projectType === 'continuous' && !data.renewalDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Data de renovação é necessária para gerar as parcelas mensais',
      path: ['renewalDate'],
    });
  }
});

export type CloseBusinessFormValues = z.infer<typeof closeBusinessSchema>;

interface CloseBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetWithDetails | null;
  lead?: LeadWithBudget | null;
  onConfirm: (data: CloseBusinessFormValues) => void;
  isSubmitting?: boolean;
  services?: Service[];
}

export function CloseBusinessDialog({
  open,
  onOpenChange,
  budget,
  lead,
  onConfirm,
  isSubmitting,
  services = [],
}: CloseBusinessDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: clients = [] } = useClients();

  const hasBudget = !!budget;
  const budgetMissingClient = hasBudget && !budget?.client_id;
  const needsClientField = !hasBudget || budgetMissingClient;

  const managers = useMemo(() => {
    return employees.filter((e) => e.systemRole === 'manager' || e.systemRole === 'admin');
  }, [employees]);

  const form = useForm<CloseBusinessFormValues>({
    resolver: zodResolver(closeBusinessSchema),
    defaultValues: {
      projectType: 'fixed_scope',
      managerId: '',
      paymentMethod: 'mensal',
      installmentsCount: budget?.duration_months || 1,
      dueDay: 10,
      dueDate: '',
      firstInvoiceDate: '',
      startDate: '',
      endDate: '',
      renewalDate: '',
      successFeePercent: undefined,
      projectName: '',
      clientId: '',
      totalValue: 0,
      monthlyValue: 0,
    },
  });

  const projectType = form.watch('projectType');
  const startDateValue = form.watch('startDate');
  const paymentMethodValue = form.watch('paymentMethod');
  const clientIdValue = form.watch('clientId');
  const managerIdValue = form.watch('managerId');
  const isUnicoPayment = paymentMethodValue === 'unico';

  const [suggestedManagerId, setSuggestedManagerId] = useState<string>('');

  const showFinancialFields = projectType === 'fixed_scope' || projectType === 'continuous';
  const showInstallmentFields = projectType === 'fixed_scope' && hasBudget;
  const showSuccessFeeField = projectType === 'success_fee';
  const isNonRevenue = projectType === 'non_revenue';
  const isContinuous = projectType === 'continuous';

  // Derive project type from the lead's service
  const derivedProjectType = useMemo((): ProjectType => {
    if (!lead?.service_line || !services.length) return 'fixed_scope';
    const billingType = services.find((s) => s.id === lead.service_line)?.billingType;
    if (!billingType) return 'fixed_scope';
    // Map service billing types to project types
    const billingToProject: Record<string, ProjectType> = {
      fixed_scope: 'fixed_scope',
      recurring: 'continuous',
      success_fee: 'success_fee',
      no_revenue: 'non_revenue',
    };
    return billingToProject[billingType] ?? 'fixed_scope';
  }, [lead?.service_line, services]);

  useEffect(() => {
    if (open) {
      const suggestedManager = lead?.responsible_id && managers.some((m) => m.id === lead.responsible_id)
        ? lead.responsible_id
        : '';
      setSuggestedManagerId(suggestedManager);

      if (budget) {
        const start = budget.start_date;
        const end = addMonths(new Date(start), budget.duration_months).toISOString().split('T')[0];

        form.reset({
          projectType: derivedProjectType,
          managerId: suggestedManager,
          paymentMethod: 'mensal',
          installmentsCount: budget.duration_months || 1,
          dueDay: 10,
          firstInvoiceDate: start,
          startDate: start,
          endDate: end,
          renewalDate: '',
          successFeePercent: undefined,
          projectName: budget.title,
          clientId: budget.client_id || '',
          totalValue: budget.final_total,
          monthlyValue: budget.final_total,
        });
      } else if (lead) {
        form.reset({
          projectType: derivedProjectType,
          managerId: suggestedManager,
          paymentMethod: 'mensal',
          installmentsCount: 1,
          dueDay: 10,
          firstInvoiceDate: '',
          startDate: '',
          endDate: '',
          renewalDate: '',
          successFeePercent: undefined,
          projectName: lead.name,
          clientId: lead.client_id || '',
          totalValue: lead.estimated_value || 0,
          monthlyValue: lead.estimated_value || 0,
        });
      }
    }
  }, [open, budget, lead, form, derivedProjectType]);

  // Auto-recalculate endDate when startDate changes (only with budget and fixed_scope)
  useEffect(() => {
    if (startDateValue && budget && open && projectType === 'fixed_scope') {
      const newEndDate = addMonths(new Date(startDateValue), budget.duration_months);
      form.setValue('endDate', newEndDate.toISOString().split('T')[0]);
    }
  }, [startDateValue, budget, form, open, projectType]);

  const handleSubmit = (values: CloseBusinessFormValues) => {
    onConfirm(values);
  };

  if (!budget && !lead) return null;

  const startDate = budget?.start_date ? new Date(budget.start_date) : new Date();
  const endDate = budget ? addMonths(startDate, budget.duration_months) : new Date();

  // Build dialog description with lead context
  const dialogDescription = lead
    ? [lead.name, lead.company_name].filter(Boolean).join(' — ') +
      (budget ? ` · Orçamento ${budget.budget_number}` : '')
    : hasBudget
    ? 'Um projeto será criado automaticamente com os dados do orçamento'
    : 'Preencha os dados do projeto para fechar o negócio';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Fechar Negócio
          </DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {/* Budget Summary */}
        {hasBudget && budget && (
          <>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dados do Orçamento (somente leitura)
                </span>
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Orçamento</span>
                <Badge variant="secondary">{budget.budget_number}</Badge>
              </div>
              <h3 className="font-semibold text-lg">{budget.title}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{budget.client?.company_name || budget.lead_name || 'Sem cliente'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-primary">
                    {formatCurrencyValue(budget.final_total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(startDate, 'MMM/yyyy', { locale: ptBR })} -{' '}
                    {format(endDate, 'MMM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{budget.duration_months} meses</span>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

            {/* ── Tipo de Projeto ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo de Projeto</p>
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <div className="grid grid-cols-2 gap-2">
                    {(['fixed_scope', 'continuous', 'success_fee', 'non_revenue'] as ProjectType[]).map(
                      (type) => {
                        const Icon = PROJECT_TYPE_ICONS[type];
                        const isSelected = field.value === type;
                        const isSuggested = type === derivedProjectType;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className={cn(
                              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 mt-0.5 shrink-0',
                                isSelected ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p
                                  className={cn(
                                    'text-sm font-medium leading-tight',
                                    !isSelected && 'text-foreground'
                                  )}
                                >
                                  {PROJECT_TYPE_LABELS[type]}
                                </p>
                                {isSuggested && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 leading-none">
                                    Sugerido
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                {PROJECT_TYPE_DESCRIPTIONS[type]}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* ── Dados do Projeto ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do Projeto</p>

            {/* Early warning for missing client on budget */}
            {budgetMissingClient && !clientIdValue && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Este orçamento não tem cliente associado. Selecione um cliente abaixo para continuar.
                </AlertDescription>
              </Alert>
            )}

            {/* No-budget mode: show project name */}
            {!hasBudget && (
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Projeto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do projeto" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Client selector */}
            {needsClientField && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Manager */}
            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gerente do Projeto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gerente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {managers.length > 0 ? (
                        managers.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nome}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum gerente disponível.
                          <br />
                          Atribua o perfil "Gerente de Projetos" ou "Administrador" a um funcionário.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {suggestedManagerId && managerIdValue === suggestedManagerId && (
                    <p className="text-xs text-muted-foreground">
                      Sugerido com base no responsável do lead
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isContinuous ? (
                <FormField
                  control={form.control}
                  name="renewalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renovação em *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Data de Fim {isNonRevenue || showSuccessFeeField ? '' : '*'}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Continuous: monthly value */}
            {isContinuous && !hasBudget && (
              <FormField
                control={form.control}
                name="monthlyValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Mensal</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value || 0} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Success Fee: percentage */}
            {showSuccessFeeField && (
              <FormField
                control={form.control}
                name="successFeePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>% de Sucesso *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Ex: 15"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      A receita será registrada quando o evento de sucesso ocorrer (ex: trimestre Lei do Bem)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fixed scope without budget: total value */}
            {!hasBudget && projectType === 'fixed_scope' && (
              <FormField
                control={form.control}
                name="totalValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total do Contrato *</FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value || 0} onValueChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ── Pagamento ── */}
            {(showInstallmentFields || (isContinuous && hasBudget)) && (
              <>
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pagamento</p>
              </>
            )}

            {/* Invoice/payment fields — only for fixed_scope with budget */}
            {showInstallmentFields && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_METHOD_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installmentsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parcelas</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstInvoiceDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Primeira NF *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isUnicoPayment ? (
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Vencimento</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="dueDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia de Vencimento</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="31" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </>
            )}

            {/* Continuous with budget: invoice config */}
            {isContinuous && hasBudget && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstInvoiceDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Primeira NF</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de Vencimento</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="31" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Separator />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Criando...' : 'Confirmar e Criar Projeto'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
