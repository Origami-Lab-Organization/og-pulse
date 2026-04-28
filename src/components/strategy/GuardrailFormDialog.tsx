import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateGuardrail, useUpdateGuardrail } from '@/hooks/useStrategy';
import { Guardrail, GuardrailOperator } from '@/types/strategy';

const UNIT_OPTIONS = [
  { value: '_none', label: '—' },
  { value: '%',    label: '%' },
  { value: 'R$',   label: 'R$' },
  { value: 'k',    label: 'k' },
  { value: 'un',   label: 'un' },
];

const schema = z.object({
  title: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  operator: z.enum(['>=', '<=']),
  threshold: z.coerce.number({ invalid_type_error: 'Informe um número' }),
  unit: z.string().optional(),
  current_value: z.union([z.coerce.number(), z.literal('')]).optional(),
});

type FormValues = z.infer<typeof schema>;

interface GuardrailFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  guardrail?: Guardrail | null;
}

export function GuardrailFormDialog({
  open,
  onOpenChange,
  cycleId,
  guardrail,
}: GuardrailFormDialogProps) {
  const createMutation = useCreateGuardrail();
  const updateMutation = useUpdateGuardrail();
  const isEditing = !!guardrail;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      operator: '>=' as GuardrailOperator,
      threshold: 0,
      unit: '',
      current_value: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && guardrail) {
        form.reset({
          title: guardrail.title,
          description: guardrail.description ?? '',
          operator: guardrail.operator,
          threshold: guardrail.threshold,
          unit: guardrail.unit ?? '',
          current_value: guardrail.currentValue ?? '',
        });
      } else {
        form.reset({ title: '', description: '', operator: '>=', threshold: 0, unit: '', current_value: '' });
      }
    }
  }, [open, guardrail]);

  const onSubmit = async (values: FormValues) => {
    const currentValueNum = values.current_value === '' || values.current_value === undefined
      ? null
      : Number(values.current_value);

    try {
      if (isEditing && guardrail) {
        await updateMutation.mutateAsync({
          id: guardrail.id,
          updates: {
            title: values.title,
            description: values.description || null,
            operator: values.operator as GuardrailOperator,
            threshold: values.threshold,
            unit: values.unit || null,
            current_value: currentValueNum,
          },
        });
      } else {
        await createMutation.mutateAsync({
          cycle_id: cycleId,
          title: values.title,
          description: values.description || null,
          operator: values.operator as GuardrailOperator,
          threshold: values.threshold,
          unit: values.unit || null,
          current_value: currentValueNum,
        });
      }
      onOpenChange(false);
    } catch {
      // handled by mutation onError
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Guardrail' : 'Novo Guardrail'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do limite inegociável.'
              : 'Defina um limite operacional mínimo que não pode ser violado.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="guardrail-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Margem de venda por projeto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Contexto e consequências de violar este limite"
                    rows={2}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="operator" render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Operador</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value=">=">≥ (mínimo)</SelectItem>
                      <SelectItem value="<=">≤ (máximo)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="threshold" render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Limite *</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" placeholder="45" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem className="col-span-1">
                  <FormLabel>Unidade</FormLabel>
                  <Select
                    value={field.value || '_none'}
                    onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="current_value" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor atual <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    placeholder="Deixe em branco para preencher depois"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="guardrail-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Criar guardrail'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
