import { useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Subscription,
  CreateSubscriptionInput,
  SUBSCRIPTION_CATEGORIES,
  BILLING_CYCLE_LABELS,
  BillingCycle,
} from '@/types/subscription';

const subscriptionFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  vendor: z.string().optional(),
  description: z.string().optional(),
  category: z.string().default('other'),
  monthlyCost: z.number().min(0),
  annualCost: z.number().min(0).optional(),
  billingCycle: z.string().default('monthly'),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof subscriptionFormSchema>;

interface SubscriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
  onSubmit: (data: CreateSubscriptionInput) => void;
  isPending?: boolean;
}

const BILLING_CYCLE_OPTIONS = Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SubscriptionFormDialog = ({
  open,
  onOpenChange,
  subscription,
  onSubmit,
  isPending = false,
}: SubscriptionFormDialogProps) => {
  const annualCostEditedRef = useRef(false);

  const form = useForm<FormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      name: '',
      vendor: '',
      description: '',
      category: 'other',
      monthlyCost: 0,
      annualCost: 0,
      billingCycle: 'monthly',
      url: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      annualCostEditedRef.current = false;
      if (subscription) {
        form.reset({
          name: subscription.name,
          vendor: subscription.vendor || '',
          description: subscription.description || '',
          category: subscription.category || 'other',
          monthlyCost: subscription.monthlyCost,
          annualCost: subscription.annualCost ?? subscription.monthlyCost * 12,
          billingCycle: subscription.billingCycle || 'monthly',
          url: subscription.url || '',
          notes: subscription.notes || '',
        });
      } else {
        form.reset({
          name: '',
          vendor: '',
          description: '',
          category: 'other',
          monthlyCost: 0,
          annualCost: 0,
          billingCycle: 'monthly',
          url: '',
          notes: '',
        });
      }
    }
  }, [open, subscription, form]);

  const handleMonthlyCostChange = (value: number) => {
    form.setValue('monthlyCost', value);
    if (!annualCostEditedRef.current) {
      form.setValue('annualCost', value * 12);
    }
  };

  const handleAnnualCostChange = (value: number) => {
    annualCostEditedRef.current = true;
    form.setValue('annualCost', value);
  };

  const handleSubmit = (data: FormData) => {
    onSubmit({
      name: data.name,
      vendor: data.vendor || undefined,
      description: data.description || undefined,
      category: data.category,
      monthlyCost: data.monthlyCost,
      annualCost: data.annualCost,
      billingCycle: data.billingCycle as BillingCycle,
      url: data.url || undefined,
      notes: data.notes || undefined,
    });
  };

  const isEditing = !!subscription;
  const monthlyCost = form.watch('monthlyCost');
  const annualCost = form.watch('annualCost');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Assinatura' : 'Nova Assinatura'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da assinatura" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vendor + Categoria */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor / Vendor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Adobe, Google, Slack..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUBSCRIPTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição da assinatura..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ciclo de Cobrança */}
            <FormField
              control={form.control}
              name="billingCycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciclo de Cobrança</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ciclo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BILLING_CYCLE_OPTIONS.map((opt) => (
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

            {/* Custo Mensal + Custo Anual */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monthlyCost"
                render={() => (
                  <FormItem>
                    <FormLabel>Custo Mensal</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={monthlyCost}
                        onValueChange={handleMonthlyCostChange}
                        showPrefix
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="annualCost"
                render={() => (
                  <FormItem>
                    <FormLabel>Custo Anual</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={annualCost ?? 0}
                        onValueChange={handleAnnualCostChange}
                        showPrefix
                        placeholder="0,00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* URL */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar Alterações' : 'Cadastrar Assinatura'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionFormDialog;
