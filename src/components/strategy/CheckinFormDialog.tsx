import { useEffect, useState } from 'react';
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
  checkin_date: z.string().min(1, 'Data é obrigatória'),
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

function isCurrencyUnit(unit: string | undefined | null) {
  return unit === 'R$';
}

function formatDisplayValue(num: number, unit: string | undefined | null): string {
  if (isCurrencyUnit(unit)) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // Generic: show up to 4 decimal places, no trailing zeros
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

function parseDisplayValue(raw: string, unit: string | undefined | null): number {
  if (isCurrencyUnit(unit)) {
    // pt-BR: "122.125,50" → strip dots, replace comma with dot → "122125.50"
    const cleaned = raw.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  }
  // Generic: accept both comma and dot as decimal separator
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function CheckinFormDialog({ open, onOpenChange, keyResult, onSuccess }: CheckinFormDialogProps) {
  const createMutation = useCreateStrategyCheckin();

  const today = new Date().toISOString().slice(0, 10);
  const [displayValue, setDisplayValue] = useState(() =>
    formatDisplayValue(keyResult.currentValue, keyResult.unit),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      checkin_date: today,
      current_value: keyResult.currentValue,
      confidence: keyResult.confidence,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        checkin_date: today,
        current_value: keyResult.currentValue,
        confidence: keyResult.confidence,
        notes: '',
      });
      setDisplayValue(formatDisplayValue(keyResult.currentValue, keyResult.unit));
    }
  }, [open, keyResult.id]);

  const confidence = form.watch('confidence');
  const { text: confText, color: confColor } = confidenceLabel(confidence);

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        key_result_id: keyResult.id,
        checkin_date: values.checkin_date,
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
            <FormField control={form.control} name="checkin_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Data do check-in *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="current_value" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Valor Atual
                  {keyResult.unit && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      ({keyResult.unit})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={displayValue}
                    onChange={(e) => {
                      setDisplayValue(e.target.value);
                      const num = parseDisplayValue(e.target.value, keyResult.unit);
                      field.onChange(num);
                    }}
                    onBlur={() => {
                      const num = parseDisplayValue(displayValue, keyResult.unit);
                      field.onChange(num);
                      setDisplayValue(formatDisplayValue(num, keyResult.unit));
                    }}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Meta: {formatDisplayValue(keyResult.targetValue, keyResult.unit)}{keyResult.unit && ` ${keyResult.unit}`}
                  {keyResult.initialValue !== undefined && ` · Início: ${formatDisplayValue(keyResult.initialValue, keyResult.unit)}${keyResult.unit ? ` ${keyResult.unit}` : ''}`}
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
