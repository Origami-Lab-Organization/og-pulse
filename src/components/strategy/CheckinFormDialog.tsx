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
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { StrategyKeyResult } from '@/types/strategy';
import { useCreateStrategyCheckin } from '@/hooks/useStrategy';

const schema = z.object({
  current_value: z.coerce.number(),
  confidence: z.number().min(0).max(10),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CheckinFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyResult: StrategyKeyResult;
  onSuccess?: () => void;
}

function confidenceLabel(value: number) {
  if (value >= 7) return { text: 'Alta confiança', color: 'text-emerald-600 dark:text-emerald-400' };
  if (value >= 4) return { text: 'Confiança moderada', color: 'text-amber-600 dark:text-amber-400' };
  return { text: 'Baixa confiança', color: 'text-red-600 dark:text-red-400' };
}

export function CheckinFormDialog({ open, onOpenChange, keyResult, onSuccess }: CheckinFormDialogProps) {
  const createMutation = useCreateStrategyCheckin();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_value: keyResult.currentValue,
      confidence: keyResult.confidence,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        current_value: keyResult.currentValue,
        confidence: keyResult.confidence,
        notes: '',
      });
    }
  }, [open, keyResult.id]);

  const confidence = form.watch('confidence');
  const { text: confText, color: confColor } = confidenceLabel(confidence);

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        key_result_id: keyResult.id,
        current_value: values.current_value,
        confidence: values.confidence,
        notes: values.notes || null,
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
          <DialogTitle>Check-in</DialogTitle>
          <DialogDescription className="line-clamp-2">{keyResult.title}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="checkin-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="current_value" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Atual</FormLabel>
                <FormControl>
                  <Input type="number" step="any" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Meta: {keyResult.targetValue}
                  {keyResult.initialValue !== undefined && ` · Início: ${keyResult.initialValue}`}
                </p>
                <FormMessage />
              </FormItem>
            )} />

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

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Comentário (opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="O que aconteceu desde o último check-in? Quais são os próximos passos?"
                    rows={3}
                    {...field}
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
          <Button type="submit" form="checkin-form" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
