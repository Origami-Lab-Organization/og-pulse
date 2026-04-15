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
import { useCreateStrategyCycle, useUpdateStrategyCycle } from '@/hooks/useStrategy';
import { StrategyCycle } from '@/types/strategy';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de término é obrigatória'),
}).refine((d) => d.end_date > d.start_date, {
  message: 'Data de término deve ser após a data de início',
  path: ['end_date'],
});

type FormValues = z.infer<typeof schema>;

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: StrategyCycle | null;
  onSuccess?: () => void;
}

export function CycleFormDialog({ open, onOpenChange, cycle, onSuccess }: CycleFormDialogProps) {
  const createMutation = useCreateStrategyCycle();
  const updateMutation = useUpdateStrategyCycle();
  const isEditing = !!cycle;

  const today = new Date().toISOString().slice(0, 10);
  const threeMonthsLater = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: `Ciclo ${new Date().getFullYear()}`,
      start_date: today,
      end_date: threeMonthsLater,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditing && cycle) {
        form.reset({
          title: cycle.title,
          start_date: cycle.startDate,
          end_date: cycle.endDate,
        });
      } else {
        form.reset({
          title: `Ciclo ${new Date().getFullYear()}`,
          start_date: today,
          end_date: threeMonthsLater,
        });
      }
    }
  }, [open, cycle?.id]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && cycle) {
        await updateMutation.mutateAsync({
          id: cycle.id,
          updates: {
            title: values.title,
            start_date: values.start_date,
            end_date: values.end_date,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: values.title,
          start_date: values.start_date,
          end_date: values.end_date,
          is_active: true,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      // error handled by mutation onError
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Ciclo' : 'Novo Ciclo Estratégico'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize o título e as datas do ciclo.'
              : 'Defina o período de planejamento da sua equipe.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="cycle-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Q1 2025" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Início *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Término *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="cycle-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Criar Ciclo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
