import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Service, CreateServiceInput, BillingType, BILLING_TYPE_LABELS } from '@/types/service';
import { formatCurrency } from '@/lib/masks';
import { cn } from '@/lib/utils';

const BILLING_TYPES: BillingType[] = ['fixed_scope', 'recurring', 'success_fee', 'no_revenue'];

const PERIOD_OPTIONS = [
  { value: 'monthly', label: 'Por mês' },
  { value: 'quarterly', label: 'Por trimestre' },
  { value: 'semiannual', label: 'Por semestre' },
  { value: 'annual', label: 'Por ano' },
];

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  billingType: z.enum(['fixed_scope', 'recurring', 'success_fee', 'no_revenue']),
  description: z.string().optional(),
  hasDefaultValue: z.boolean(),
  defaultValue: z.number().min(0).optional(),
  billingUnit: z.string().optional(),
  valueMode: z.enum(['currency', 'percent']),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSubmit: (data: CreateServiceInput) => void;
  isLoading?: boolean;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
  isLoading,
}: ServiceFormDialogProps) {
  const [valueDisplay, setValueDisplay] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      billingType: 'fixed_scope',
      description: '',
      hasDefaultValue: false,
      defaultValue: undefined,
      billingUnit: undefined,
      valueMode: 'currency',
    },
  });

  const billingType = form.watch('billingType');
  const hasDefaultValue = form.watch('hasDefaultValue');
  const valueMode = form.watch('valueMode');

  useEffect(() => {
    if (open) {
      if (service) {
        // Determine valueMode from billing_unit for success_fee
        const isPercent = service.billingType === 'success_fee' && service.billingUnit === '%';
        form.reset({
          name: service.name,
          billingType: service.billingType,
          description: service.description ?? '',
          hasDefaultValue: service.hasDefaultValue,
          defaultValue: service.defaultValue ?? undefined,
          billingUnit: service.billingUnit ?? undefined,
          valueMode: isPercent ? 'percent' : 'currency',
        });
        setValueDisplay(service.defaultValue ? formatCurrency(service.defaultValue) : '');
      } else {
        form.reset({
          name: '',
          billingType: 'fixed_scope',
          description: '',
          hasDefaultValue: false,
          defaultValue: undefined,
          billingUnit: undefined,
          valueMode: 'currency',
        });
        setValueDisplay('');
      }
    }
  }, [open, service]);

  // Reset value fields when billing type changes
  useEffect(() => {
    form.setValue('hasDefaultValue', false);
    form.setValue('defaultValue', undefined);
    form.setValue('billingUnit', undefined);
    form.setValue('valueMode', 'currency');
    setValueDisplay('');
  }, [billingType]);

  const handleSubmit = (values: FormValues) => {
    let billingUnit: string | undefined = undefined;

    if (values.hasDefaultValue) {
      if (values.billingType === 'recurring') {
        billingUnit = values.billingUnit;
      } else if (values.billingType === 'success_fee') {
        billingUnit = values.valueMode === 'percent' ? '%' : 'R$';
      }
    }

    onSubmit({
      name: values.name,
      billingType: values.billingType,
      description: values.description || undefined,
      hasDefaultValue: values.billingType !== 'no_revenue' ? values.hasDefaultValue : false,
      defaultValue: values.hasDefaultValue ? values.defaultValue : undefined,
      billingUnit,
    });
  };

  const showHasDefaultValue = billingType !== 'no_revenue';
  const showValueFields = hasDefaultValue && billingType !== 'no_revenue';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do serviço *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Consultoria de Projeto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o serviço (opcional)"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Billing type */}
            <FormField
              control={form.control}
              name="billingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de cobrança *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BILLING_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {BILLING_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Has default value toggle */}
            {showHasDefaultValue && (
              <FormField
                control={form.control}
                name="hasDefaultValue"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">
                        Definir valor padrão?
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Dynamic value fields */}
            {showValueFields && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                {/* fixed_scope: just R$ input */}
                {billingType === 'fixed_scope' && (
                  <FormField
                    control={form.control}
                    name="defaultValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor padrão</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              R$
                            </span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="0,00"
                              className="pl-9"
                              value={valueDisplay}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                setValueDisplay(digits ? formatCurrency(digits) : '');
                                field.onChange(digits ? parseInt(digits, 10) / 100 : undefined);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* recurring: R$ input + period select */}
                {billingType === 'recurring' && (
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="defaultValue"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Valor padrão</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                R$
                              </span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder="0,00"
                                className="pl-9"
                                value={valueDisplay}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  setValueDisplay(digits ? formatCurrency(digits) : '');
                                  field.onChange(digits ? parseInt(digits, 10) / 100 : undefined);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billingUnit"
                      render={({ field }) => (
                        <FormItem className="w-40">
                          <FormLabel>Periodicidade</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Período" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PERIOD_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* success_fee: R$|% toggle + value input */}
                {billingType === 'success_fee' && (
                  <>
                    <FormField
                      control={form.control}
                      name="valueMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modo de valor</FormLabel>
                          <FormControl>
                            <div className="flex rounded-md border overflow-hidden w-fit">
                              <button
                                type="button"
                                onClick={() => field.onChange('currency')}
                                className={cn(
                                  'px-4 py-1.5 text-sm font-medium transition-colors',
                                  field.value === 'currency'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                                )}
                              >
                                R$
                              </button>
                              <button
                                type="button"
                                onClick={() => field.onChange('percent')}
                                className={cn(
                                  'px-4 py-1.5 text-sm font-medium transition-colors border-l',
                                  field.value === 'percent'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                                )}
                              >
                                %
                              </button>
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor padrão</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                {valueMode === 'percent' ? '%' : 'R$'}
                              </span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder={valueMode === 'percent' ? '0,00' : '0,00'}
                                className="pl-9"
                                value={valueDisplay}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  if (valueMode === 'percent') {
                                    // Store as percentage value (e.g. 15.5 for 15.5%)
                                    const val = digits ? parseInt(digits, 10) / 100 : undefined;
                                    setValueDisplay(digits ? (parseInt(digits, 10) / 100).toFixed(2).replace('.', ',') : '');
                                    field.onChange(val);
                                  } else {
                                    setValueDisplay(digits ? formatCurrency(digits) : '');
                                    field.onChange(digits ? parseInt(digits, 10) / 100 : undefined);
                                  }
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            {/* Informational text when toggle is off */}
            {showHasDefaultValue && !hasDefaultValue && (
              <p className="text-xs text-muted-foreground">
                O valor será definido individualmente em cada lead/proposta.
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {service ? 'Salvar' : 'Criar Serviço'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
