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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateStrategyKeyResult } from '@/hooks/useStrategy';

const schema = z.object({
  title: z.string().min(1, 'Nome é obrigatório'),
  initial_value: z.coerce.number(),
  target_value: z.coerce.number().min(0.01, 'Meta deve ser maior que zero'),
  unit: z.string().optional(),
  confidence: z.number().min(0).max(10),
  owner_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface KeyResultFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  onSuccess?: () => void;
}

function confidenceLabel(value: number) {
  if (value >= 7) return { text: 'Alta confiança', color: 'text-emerald-600 dark:text-emerald-400' };
  if (value >= 4) return { text: 'Confiança moderada', color: 'text-amber-600 dark:text-amber-400' };
  return { text: 'Baixa confiança', color: 'text-red-600 dark:text-red-400' };
}

export function KeyResultFormDialog({ open, onOpenChange, objectiveId, onSuccess }: KeyResultFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateStrategyKeyResult();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      initial_value: 0,
      target_value: 0,
      unit: '',
      confidence: 5,
      owner_id: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ title: '', initial_value: 0, target_value: 0, unit: '', confidence: 5, owner_id: '' });
    }
  }, [open]);

  const confidence = form.watch('confidence');
  const { text: confText, color: confColor } = confidenceLabel(confidence);

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        objective_id: objectiveId,
        title: values.title,
        initial_value: values.initial_value,
        target_value: values.target_value,
        current_value: values.initial_value,
        confidence: values.confidence,
        owner_id: values.owner_id || null,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // error handled by mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Key Result</DialogTitle>
          <DialogDescription>Defina uma métrica mensurável para o objetivo.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="kr-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: NPS acima de 70" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="initial_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Inicial</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="target_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta *</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  <FormControl>
                    <Input placeholder="%, pts..." {...field} />
                  </FormControl>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="confidence" render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between mb-1">
                  <FormLabel>Confiança</FormLabel>
                  <span className={cn('text-sm font-semibold tabular-nums', confColor)}>
                    {field.value}/10 — {confText}
                  </span>
                </div>
                <FormControl>
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[field.value]}
                    onValueChange={([v]) => field.onChange(v)}
                    className="my-1"
                  />
                </FormControl>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span className="text-red-500">0–3 Crítico</span>
                  <span className="text-amber-500">4–6 Moderado</span>
                  <span className="text-emerald-500">7–10 No caminho</span>
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="owner_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees
                      .filter((e) => e.status === 'ativo')
                      .map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="kr-form" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Key Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
