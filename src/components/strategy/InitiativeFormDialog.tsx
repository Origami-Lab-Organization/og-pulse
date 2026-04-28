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
import { useCreateStrategyInitiative, useUpdateStrategyInitiative } from '@/hooks/useStrategy';
import {
  StrategyObjectiveWithKrs,
  StrategyInitiative,
  InitiativeStatus,
} from '@/types/strategy';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  objective_id: z.string().min(1, 'Objetivo é obrigatório'),
  owner_id: z.string().optional(),
  due_date: z.string().optional(),
  due_date_notes: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']),
});

type FormValues = z.infer<typeof schema>;

interface InitiativeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectives: StrategyObjectiveWithKrs[];
  initiative?: StrategyInitiative | null;
  defaultObjectiveId?: string;
  onSuccess?: () => void;
}

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
};

export function InitiativeFormDialog({
  open,
  onOpenChange,
  objectives,
  initiative,
  defaultObjectiveId,
  onSuccess,
}: InitiativeFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateStrategyInitiative();
  const updateMutation = useUpdateStrategyInitiative();
  const isEditing = !!initiative;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      objective_id: defaultObjectiveId ?? '',
      owner_id: '',
      due_date: '',
      due_date_notes: '',
      notes: '',
      status: 'backlog',
    },
  });

  useEffect(() => {
    if (open) {
      if (initiative) {
        form.reset({
          title: initiative.title,
          objective_id: initiative.objectiveId,
          owner_id: initiative.ownerId ?? '',
          due_date: initiative.dueDate ?? '',
          due_date_notes: initiative.dueDateNotes ?? '',
          notes: initiative.notes ?? initiative.description ?? '',
          status: initiative.status,
        });
      } else {
        form.reset({
          title: '',
          objective_id: defaultObjectiveId ?? '',
          owner_id: '',
          due_date: '',
          due_date_notes: '',
          notes: '',
          status: 'backlog',
        });
      }
    }
  }, [open, defaultObjectiveId, initiative, form]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      objective_id: values.objective_id,
      status: values.status,
      priority: null,
      effort: null,
      owner_id: values.owner_id || null,
      due_date: values.due_date || null,
      due_date_notes: values.due_date_notes || null,
      notes: values.notes || null,
    };

    try {
      if (initiative) {
        await updateMutation.mutateAsync({
          id: initiative.id,
          updates: payload,
        });
      } else {
        await createMutation.mutateAsync({
          ...payload,
          position: 0,
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
          <DialogTitle>{isEditing ? 'Editar Iniciativa' : 'Nova Iniciativa'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da iniciativa.'
              : 'Adicione uma ação concreta para avançar um objetivo.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="initiative-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Título *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Implementar NPS no produto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="objective_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivo vinculado *</FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o objetivo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {objectives.map((obj) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        <span className="truncate max-w-xs">{obj.title}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="owner_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Dono</FormLabel>
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dono" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Sem dono</SelectItem>
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

            <FormField control={form.control} name="due_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Prazo de entrega</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="due_date_notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Contexto do prazo <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Explique o motivo ou condições do prazo..."
                    rows={2}
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Coluna inicial</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.entries(STATUS_LABELS) as [InitiativeStatus, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Contexto, dependências, decisões e próximos passos..."
                    rows={4}
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
          <Button type="submit" form="initiative-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Salvar alterações' : 'Criar Iniciativa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
