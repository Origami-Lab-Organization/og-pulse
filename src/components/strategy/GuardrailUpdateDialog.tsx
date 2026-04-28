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
import { useUpdateGuardrail } from '@/hooks/useStrategy';
import { Guardrail } from '@/types/strategy';

const schema = z.object({
  current_value: z.coerce.number({ invalid_type_error: 'Informe um número' }),
});

type FormValues = z.infer<typeof schema>;

interface GuardrailUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardrail: Guardrail | null;
}

export function GuardrailUpdateDialog({ open, onOpenChange, guardrail }: GuardrailUpdateDialogProps) {
  const updateMutation = useUpdateGuardrail();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_value: 0 },
  });

  useEffect(() => {
    if (open && guardrail) {
      form.reset({ current_value: guardrail.currentValue ?? 0 });
    }
  }, [open, guardrail]);

  if (!guardrail) return null;

  const unitLabel = guardrail.unit
    ? guardrail.unit === 'R$' ? 'R$' : guardrail.unit
    : '';

  const onSubmit = async (values: FormValues) => {
    try {
      await updateMutation.mutateAsync({
        id: guardrail.id,
        updates: { current_value: values.current_value },
      });
      onOpenChange(false);
    } catch {
      // handled by mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atualizar valor atual</DialogTitle>
          <DialogDescription className="line-clamp-2">{guardrail.title}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="guardrail-update-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField control={form.control} name="current_value" render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Valor atual{unitLabel ? ` (${unitLabel})` : ''}
                </FormLabel>
                <FormControl>
                  <Input type="number" step="any" autoFocus {...field} />
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
          <Button type="submit" form="guardrail-update-form" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
