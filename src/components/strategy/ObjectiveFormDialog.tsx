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
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateStrategyObjective, useUpdateStrategyObjective } from '@/hooks/useStrategy';
import { StrategyObjectiveWithKrs } from '@/types/strategy';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  owner_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ObjectiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId: string;
  objective?: StrategyObjectiveWithKrs | null;
  onSuccess?: () => void;
}

export function ObjectiveFormDialog({ open, onOpenChange, cycleId, objective, onSuccess }: ObjectiveFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateStrategyObjective();
  const updateMutation = useUpdateStrategyObjective();
  const isEditing = !!objective;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', owner_id: '' },
  });

  useEffect(() => {
    if (open) {
      if (objective) {
        form.reset({
          title: objective.title,
          description: objective.description || '',
          owner_id: objective.ownerId || '',
        });
      } else {
        form.reset({ title: '', description: '', owner_id: '' });
      }
    }
  }, [open, objective]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: objective.id,
          updates: {
            title: values.title,
            description: values.description || null,
            owner_id: values.owner_id || null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          cycle_id: cycleId,
          title: values.title,
          description: values.description || null,
          owner_id: values.owner_id || null,
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
          <DialogTitle>{isEditing ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do objetivo.' : 'Defina um resultado desejado para o ciclo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="objective-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Aumentar retenção de clientes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição / Racional</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Contexto ou motivação do objetivo..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
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
          <Button type="submit" form="objective-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar' : 'Criar Objetivo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
