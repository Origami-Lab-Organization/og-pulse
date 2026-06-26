import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { MODEL_META } from '@/components/services/revenueModelMeta';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Por mês' },
  { value: 'quarterly', label: 'Por trimestre' },
  { value: 'semiannual', label: 'Por semestre' },
  { value: 'annual', label: 'Por ano' },
];

const formSchema = z.object({
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
    defaultValues: { modelType: 'fixed', period: 'monthly' },
  });

  const modelType = form.watch('modelType') as RevenueModelType;

  useEffect(() => {
    if (!open) return;
    if (model) {
      form.reset({
        modelType: model.modelType,
        period: model.modelType === 'recurring' ? model.billingUnit ?? 'monthly' : 'monthly',
      });
    } else {
      form.reset({ modelType: 'fixed', period: 'monthly' });
    }
  }, [open, model]);

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
      name: REVENUE_MODEL_LABELS[values.modelType as RevenueModelType],
      modelType: values.modelType,
      baseValue: null,
      billingUnit,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {model ? 'Editar Modelo de Receita' : 'Novo Modelo de Receita'}
          </DialogTitle>
          <DialogDescription>
            Escolha como este serviço será cobrado. O modelo de cobrança define a forma de
            precificação aplicada aos serviços.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Tipo de modelo</p>
              <div className="grid grid-cols-2 gap-2">
                {REVENUE_MODEL_TYPES.map((type) => {
                  const { icon: Icon, description } = MODEL_META[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => form.setValue('modelType', type, { shouldValidate: true })}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50',
                        modelType === type
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border'
                      )}
                    >
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-tight">
                          {REVENUE_MODEL_LABELS[type]}
                        </p>
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          {description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
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
