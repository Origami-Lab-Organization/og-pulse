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
import { BudgetWithDetails } from '@/types/budget';
import { LeadWithBudget } from '@/types/lead';
import { PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useEmployees } from '@/hooks/useEmployees';
import { useClients } from '@/hooks/useClients';
import { formatCurrency as formatCurrencyValue } from '@/lib/formatters';
import { Briefcase, Calendar, DollarSign, User, Building2 } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';

// Schema with conditional validation - invoice fields optional when no budget
const closeBusinessSchema = z.object({
  managerId: z.string().min(1, 'Gerente é obrigatório'),
  paymentMethod: z.string().default('mensal'),
  installmentsCount: z.coerce.number().min(1).default(1),
  dueDay: z.coerce.number().min(1).max(31).default(10),
  dueDate: z.string().optional().default(''),
  firstInvoiceDate: z.string().optional().default(''),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().min(1, 'Data de fim é obrigatória'),
  // Fields for no-budget mode
  projectName: z.string().optional(),
  clientId: z.string().optional(),
  totalValue: z.coerce.number().optional(),
});

type CloseBusinessFormValues = z.infer<typeof closeBusinessSchema>;

interface CloseBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetWithDetails | null;
  lead?: LeadWithBudget | null;
  onConfirm: (data: CloseBusinessFormValues) => void;
  isSubmitting?: boolean;
}

export function CloseBusinessDialog({
  open,
  onOpenChange,
  budget,
  lead,
  onConfirm,
  isSubmitting,
}: CloseBusinessDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: clients = [] } = useClients();

  const hasBudget = !!budget;

  // Filter managers
  const managers = useMemo(() => {
    return employees.filter((e) => e.systemRole === 'manager' || e.systemRole === 'admin');
  }, [employees]);

  const form = useForm<CloseBusinessFormValues>({
    resolver: zodResolver(closeBusinessSchema),
    defaultValues: {
      managerId: '',
      paymentMethod: 'mensal',
      installmentsCount: budget?.duration_months || 1,
      dueDay: 10,
      dueDate: '',
      firstInvoiceDate: '',
      startDate: '',
      endDate: '',
      projectName: '',
      clientId: '',
      totalValue: 0,
    },
  });

  // Watch startDate to auto-calculate endDate
  const startDateValue = form.watch('startDate');
  const paymentMethodValue = form.watch('paymentMethod');
  const isUnicoPayment = paymentMethodValue === 'unico';

  // Reset form when budget/lead changes
  useEffect(() => {
    if (open) {
      if (budget) {
        const start = budget.start_date;
        const end = addMonths(new Date(start), budget.duration_months).toISOString().split('T')[0];
        
        form.reset({
          managerId: '',
          paymentMethod: 'mensal',
          installmentsCount: budget.duration_months || 1,
          dueDay: 10,
          firstInvoiceDate: start,
          startDate: start,
          endDate: end,
          projectName: budget.title,
          clientId: budget.client_id || '',
          totalValue: budget.final_total,
        });
      } else if (lead) {
        form.reset({
          managerId: '',
          paymentMethod: 'mensal',
          installmentsCount: 1,
          dueDay: 10,
          firstInvoiceDate: '',
          startDate: '',
          endDate: '',
          projectName: lead.name,
          clientId: lead.client_id || '',
          totalValue: lead.estimated_value || 0,
        });
      }
    }
  }, [open, budget, lead, form]);

  // Auto-recalculate endDate when startDate changes (only with budget)
  useEffect(() => {
    if (startDateValue && budget && open) {
      const newEndDate = addMonths(new Date(startDateValue), budget.duration_months);
      form.setValue('endDate', newEndDate.toISOString().split('T')[0]);
    }
  }, [startDateValue, budget, form, open]);

  const handleSubmit = (values: CloseBusinessFormValues) => {
    onConfirm(values);
  };

  // Allow rendering without budget if lead exists
  if (!budget && !lead) return null;

  // Calculate end date preview for budget mode
  const startDate = budget?.start_date ? new Date(budget.start_date) : new Date();
  const endDate = budget ? addMonths(startDate, budget.duration_months) : new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Fechar Negócio
          </DialogTitle>
          <DialogDescription>
            {hasBudget
              ? 'Um projeto será criado automaticamente com os dados do orçamento'
              : 'Preencha os dados do projeto para fechar o negócio'}
          </DialogDescription>
        </DialogHeader>

        {/* Budget Summary - only shown when budget exists */}
        {hasBudget && budget && (
          <>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
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
                    {format(startDate, 'MMM/yyyy', { locale: ptBR })} - {format(endDate, 'MMM/yyyy', { locale: ptBR })}
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

        {/* Form for project data */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hasBudget
                ? 'Complete as informações abaixo para criar o projeto:'
                : 'Informe os dados do projeto:'}
            </p>

            {/* No-budget mode: show project name, client, and value */}
            {!hasBudget && (
              <>
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

                <FormField
                  control={form.control}
                  name="totalValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total do Contrato *</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value || 0}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Invoice fields - only shown when budget exists */}
            {hasBudget && (
              <>
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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

            <Separator />

            <div className="flex justify-end gap-3">
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
