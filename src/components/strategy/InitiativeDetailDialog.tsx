import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getStrategyInitiativeBadgeClass } from '@/lib/strategyInitiativeBadge';
import { useEmployees } from '@/hooks/useEmployees';
import { useUpdateStrategyInitiative } from '@/hooks/useStrategy';
import { InitiativeStatus, StrategyInitiative, StrategyObjectiveWithKrs } from '@/types/strategy';

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  review: 'Em revisão',
  done: 'Concluído',
};

const STATUS_COLORS: Record<InitiativeStatus, string> = {
  backlog: 'text-muted-foreground',
  in_progress: 'text-blue-600 dark:text-blue-400',
  review: 'text-amber-600 dark:text-amber-400',
  done: 'text-emerald-600 dark:text-emerald-400',
};

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  objective_id: z.string().min(1, 'Objetivo é obrigatório'),
  owner_id: z.string().optional(),
  due_date: z.string().optional(),
  due_date_notes: z.string().optional(),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function ReadField({ label, children, empty = '—' }: { label: string; children?: React.ReactNode; empty?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex min-h-9 items-center rounded-md border bg-muted/30 px-3 py-2 text-sm">
        {children ?? <span className="text-muted-foreground">{empty}</span>}
      </div>
    </div>
  );
}

interface InitiativeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiative: StrategyInitiative | null;
  objectives: StrategyObjectiveWithKrs[];
  cycleIsActive: boolean;
  canManageInitiatives: boolean;
  onDelete: () => void;
}

export function InitiativeDetailDialog({
  open,
  onOpenChange,
  initiative,
  objectives,
  cycleIsActive,
  canManageInitiatives,
  onDelete,
}: InitiativeDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateMutation = useUpdateStrategyInitiative();
  const { data: employees = [] } = useEmployees();

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  useEffect(() => {
    if (initiative) {
      form.reset({
        title: initiative.title,
        objective_id: initiative.objectiveId,
        owner_id: initiative.ownerId ?? '',
        due_date: initiative.dueDate ?? '',
        due_date_notes: initiative.dueDateNotes ?? '',
        status: initiative.status,
        notes: initiative.notes ?? initiative.description ?? '',
      });
    }
  }, [form, initiative]);

  if (!initiative) return null;

  const onSubmit = async (values: FormValues) => {
    try {
      await updateMutation.mutateAsync({
        id: initiative.id,
        updates: {
          title: values.title,
          objective_id: values.objective_id,
          owner_id: values.owner_id || null,
          due_date: values.due_date || null,
          due_date_notes: values.due_date_notes || null,
          status: values.status as InitiativeStatus,
          notes: values.notes || null,
        },
      });
      setIsEditing(false);
    } catch {
      // handled by mutation onError
    }
  };

  const visibleNotes = initiative.notes ?? initiative.description;
  const badgeClass = getStrategyInitiativeBadgeClass(initiative.objectiveId ?? initiative.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {canManageInitiatives && cycleIsActive && !isEditing && (
          <div className="absolute right-10 top-3.5 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-sm opacity-70 hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="pr-14 leading-snug">{initiative.title}</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className={cn('text-sm font-medium', STATUS_COLORS[initiative.status])}>
                ● {STATUS_LABELS[initiative.status]}
              </span>
              {initiative.objectiveTitle && (
                <Badge variant="outline" className={cn('max-w-[240px] text-xs font-medium', badgeClass)}>
                  <span className="truncate">{initiative.objectiveTitle}</span>
                </Badge>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* ── VIEW MODE ────────────────────────────────────────────────── */}
        {!isEditing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ReadField label="Coluna">{STATUS_LABELS[initiative.status]}</ReadField>

              <ReadField label="Objetivo vinculado" empty="Não vinculado">
                {initiative.objectiveTitle ? (
                  <Badge variant="outline" className={cn('text-xs font-medium', badgeClass)}>
                    {initiative.objectiveTitle}
                  </Badge>
                ) : null}
              </ReadField>

              <ReadField label="Dono" empty="Sem dono">
                {initiative.ownerName ?? null}
              </ReadField>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Prazo de entrega</p>
                <div className="flex min-h-9 items-center rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {formatDate(initiative.dueDate) ?? (
                    <span className="text-muted-foreground">Não definido</span>
                  )}
                </div>
                {initiative.dueDateNotes && (
                  <p className="px-1 text-xs text-muted-foreground whitespace-pre-wrap">
                    {initiative.dueDateNotes}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Observações</p>
              <div className="min-h-24 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {visibleNotes ? (
                  <p className="whitespace-pre-wrap leading-6">{visibleNotes}</p>
                ) : (
                  <span className="text-muted-foreground">Nenhuma observação registrada.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT MODE ────────────────────────────────────────────────── */}
        {isEditing && (
          <Form {...form}>
            <form
              id="initiative-detail-edit-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título *</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coluna</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.entries(STATUS_LABELS) as [InitiativeStatus, string][]).map(
                            ([val, label]) => (
                              <SelectItem key={val} value={val}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective_id"
                  render={({ field }) => (
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
                              <span className="truncate">{obj.title}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dono</FormLabel>
                      <Select
                        value={field.value || '__none__'}
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem dono" />
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
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prazo de entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="due_date_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Contexto do prazo{' '}
                      <span className="font-normal text-muted-foreground">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explique o motivo ou condições do prazo..."
                        rows={2}
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
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
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {isEditing && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="initiative-detail-edit-form"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
