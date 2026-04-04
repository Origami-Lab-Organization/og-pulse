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
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateStrategyInitiative } from '@/hooks/useStrategy';
import { StrategyObjectiveWithKrs, InitiativeStatus, InitiativePriority, InitiativeEffort } from '@/types/strategy';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  objective_id: z.string().min(1, 'Objetivo é obrigatório'),
  priority: z.enum(['alta', 'media', 'baixa']).optional(),
  effort: z.coerce.number().optional(),
  owner_id: z.string().optional(),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']),
});

type FormValues = z.infer<typeof schema>;

interface InitiativeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectives: StrategyObjectiveWithKrs[];
  defaultObjectiveId?: string;
  onSuccess?: () => void;
}

const PRIORITY_LABELS: Record<InitiativePriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

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
  defaultObjectiveId,
  onSuccess,
}: InitiativeFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateStrategyInitiative();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      objective_id: defaultObjectiveId ?? '',
      priority: undefined,
      effort: undefined,
      owner_id: '',
      status: 'backlog',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        objective_id: defaultObjectiveId ?? '',
        priority: undefined,
        effort: undefined,
        owner_id: '',
        status: 'backlog',
      });
    }
  }, [open, defaultObjectiveId]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        title: values.title,
        objective_id: values.objective_id,
        status: values.status,
        priority: (values.priority as InitiativePriority) ?? null,
        effort: values.effort ? (values.effort as InitiativeEffort) : null,
        owner_id: values.owner_id || null,
        position: 0,
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
          <DialogTitle>Nova Iniciativa</DialogTitle>
          <DialogDescription>Adicione uma ação concreta para avançar um objetivo.</DialogDescription>
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

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? undefined : v)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sem prioridade</SelectItem>
                    {(Object.entries(PRIORITY_LABELS) as [InitiativePriority, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="effort" render={({ field }) => (
                <FormItem>
                  <FormLabel>Esforço</FormLabel>
                  <Select
                    value={field.value != null ? String(field.value) : 'none'}
                    onValueChange={(v) => field.onChange(v === 'none' ? undefined : Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sem definição</SelectItem>
                      <SelectItem value="1">P — Pequeno</SelectItem>
                      <SelectItem value="2">M — Médio</SelectItem>
                      <SelectItem value="3">G — Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

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
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="initiative-form" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Iniciativa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
