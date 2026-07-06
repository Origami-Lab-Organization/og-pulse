import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Loader2 } from 'lucide-react';
import {
  ServiceRevenueModel,
  CreateServiceRevenueModelInput,
  RevenueModelType,
  REVENUE_MODEL_TYPES,
  REVENUE_MODEL_LABELS,
  isPercentModel,
} from '@/types/serviceRevenueModel';

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Por mês' },
  { value: 'quarterly', label: 'Por trimestre' },
  { value: 'semiannual', label: 'Por semestre' },
  { value: 'annual', label: 'Por ano' },
];

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  modelType: z.enum([
    'fixed',
    'recurring',
    'success_fee',
    'indication',
    'equity',
    'fixed_success_fee',
    'fixed_recurring',
    'recurring_success_fee',
  ]),
  period: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RevenueModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  model: ServiceRevenueModel | null;
  onSubmit: (data: CreateServiceRevenueModelInput) => void;
  isLoading?: boolean;
}

export function RevenueModelFormDialog({
  open,
  onOpenChange,
  serviceId,
  model,
  onSubmit,
  isLoading,
}: RevenueModelFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', modelType: 'fixed', period: 'monthly' },
  });

  const modelType = form.watch('modelType') as RevenueModelType;

  useEffect(() => {
    if (!open) return;
    if (model) {
      form.reset({
        name: model.name,
        modelType: model.modelType,
        period: model.modelType === 'recurring' ? model.billingUnit ?? 'monthly' : 'monthly',
      });
    } else {
      form.reset({ name: '', modelType: 'fixed', period: 'monthly' });
    }
  }, [open, model]);

  // Sugere um nome a partir do tipo quando o campo está vazio (apenas na criação).
  useEffect(() => {
    if (open && !model && !form.getValues('name')) {
      form.setValue('name', REVENUE_MODEL_LABELS[modelType]);
    }
  }, [modelType, open, model]);

  const handleSubmit = (values: FormValues) => {
    let billingUnit: string | null = null;
    if (isPercentModel(values.modelType)) {
      billingUnit = '%';
    } else if (values.modelType === 'recurring') {
      billingUnit = values.period ?? 'monthly';
    } else {
      billingUnit = 'R$';
    }

    onSubmit({
      serviceId,
      name: values.name,
      modelType: values.modelType,
      baseValue: null,
      billingUnit,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{model ? 'Editar Modelo de Receita' : 'Novo Modelo de Receita'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="modelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de modelo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REVENUE_MODEL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {REVENUE_MODEL_LABELS[t]}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do modelo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Escopo Fixo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {modelType === 'recurring' && (
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodicidade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {model ? 'Salvar' : 'Criar modelo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
