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
import { PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useEmployees } from '@/hooks/useEmployees';
import { formatCurrency as formatCurrencyValue } from '@/lib/formatters';
import { Briefcase, Calendar, DollarSign, User, Building2 } from 'lucide-react';

const closeBusinessSchema = z.object({
  managerId: z.string().min(1, 'Gerente é obrigatório'),
  paymentMethod: z.string().default('mensal'),
  installmentsCount: z.coerce.number().min(1, 'Mínimo de 1 parcela'),
  dueDay: z.coerce.number().min(1).max(31).default(10),
  firstInvoiceDate: z.string().min(1, 'Data da primeira NF é obrigatória'),
});

type CloseBusinessFormValues = z.infer<typeof closeBusinessSchema>;

interface CloseBusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetWithDetails | null;
  onConfirm: (data: CloseBusinessFormValues) => void;
  isSubmitting?: boolean;
}

export function CloseBusinessDialog({
  open,
  onOpenChange,
  budget,
  onConfirm,
  isSubmitting,
}: CloseBusinessDialogProps) {
  const { data: employees = [] } = useEmployees();

  // Filter managers - employees who have manager or admin role
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
      firstInvoiceDate: '',
    },
  });

  // Reset form when budget changes
  useEffect(() => {
    if (open && budget) {
      // Calculate first invoice date as start_date of the budget
      const startDate = budget.start_date;
      
      form.reset({
        managerId: '',
        paymentMethod: 'mensal',
        installmentsCount: budget.duration_months || 1,
        dueDay: 10,
        firstInvoiceDate: startDate,
      });
    }
  }, [open, budget, form]);

  const handleSubmit = (values: CloseBusinessFormValues) => {
    onConfirm(values);
  };

  if (!budget) return null;

  // Calculate end date preview
  const startDate = budget.start_date ? new Date(budget.start_date) : new Date();
  const endDate = addMonths(startDate, budget.duration_months);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Fechar Negócio
          </DialogTitle>
          <DialogDescription>
            Um projeto será criado automaticamente com os dados do orçamento
          </DialogDescription>
        </DialogHeader>

        {/* Budget Summary */}
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

        {/* Form for additional project data */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete as informações abaixo para criar o projeto:
            </p>

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
