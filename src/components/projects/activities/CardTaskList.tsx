// ACT-07 — Sub-tarefas do card
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityPermissions } from '@/hooks/useActivityPermissions';
import { useProjectAssignableMembers } from '@/hooks/useProjectAssignableMembers';
import {
  useCardTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTask,
} from '@/hooks/useCardTasks';
import { ActivityTaskWithRelations } from '@/types/projectActivity';
import { ProjectWithRelations } from '@/types/project';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '';
  try { return format(parseISO(d), 'dd/MM', { locale: ptBR }); } catch { return d; }
}

function dateToStr(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().split('T')[0];
}

function strToDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  try { return parseISO(s); } catch { return undefined; }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CardTaskListProps {
  cardId: string;
  project: ProjectWithRelations;
  tenantId: string;
  disabled?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CardTaskList({ cardId, project, tenantId, disabled = false }: CardTaskListProps) {
  const { employee } = useAuth();
  const { canManage, isEmployee } = useActivityPermissions(project);
  const { data: members = [] } = useProjectAssignableMembers(project.id);

  const { data: tasks = [] } = useCardTasks(cardId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const toggleTask = useToggleTask();

  // ── Add form state ─────────────────────────────────────────────────────────
  const [addDesc,       setAddDesc]       = useState('');
  const [addAssigneeId, setAddAssigneeId] = useState('__none__');
  const [addDueDate,    setAddDueDate]    = useState<Date | undefined>(undefined);

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [editDesc,       setEditDesc]       = useState('');
  const [editAssigneeId, setEditAssigneeId] = useState('__none__');
  const [editDueDate,    setEditDueDate]    = useState<Date | undefined>(undefined);

  // ── Permissions ────────────────────────────────────────────────────────────
  // `project_activity_tasks` escreve sob `can_manage_project`; quem só está alocado mexe
  // na tarefa que é dele. Mesma pergunta que a policy faz.
  const canManageTask = (task: ActivityTaskWithRelations): boolean => {
    if (canManage) return true;
    if (isEmployee) return task.assignee_id === employee?.id;
    return false;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = () => {
    const desc = addDesc.trim();
    if (!desc) return;
    createTask.mutate({
      cardId,
      tenantId,
      projectId: project.id,
      description: desc,
      assigneeId: addAssigneeId !== '__none__' ? addAssigneeId : undefined,
      dueDate: dateToStr(addDueDate),
      position: tasks.length,
    }, {
      onSuccess: () => {
        setAddDesc('');
        setAddAssigneeId('__none__');
        setAddDueDate(undefined);
      },
    });
  };

  const startEdit = (task: ActivityTaskWithRelations) => {
    setEditingId(task.id);
    setEditDesc(task.description);
    setEditAssigneeId(task.assignee_id ?? '__none__');
    setEditDueDate(strToDate(task.due_date));
  };

  const cancelEdit = () => setEditingId(null);

  const handleUpdate = (task: ActivityTaskWithRelations) => {
    const desc = editDesc.trim();
    if (!desc) return;
    updateTask.mutate({
      id: task.id,
      cardId,
      description: desc,
      assigneeId: editAssigneeId !== '__none__' ? editAssigneeId : null,
      dueDate: dateToStr(editDueDate) ?? null,
    }, { onSuccess: () => setEditingId(null) });
  };

  const handleToggle = (task: ActivityTaskWithRelations) => {
    toggleTask.mutate({ task, tenantId, projectId: project.id });
  };

  const handleDelete = (task: ActivityTaskWithRelations) => {
    deleteTask.mutate({ id: task.id, cardId });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1">

      {tasks.length === 0 && (
        <p className="text-xs text-muted-foreground py-1">Nenhuma tarefa ainda.</p>
      )}

      {tasks.map((task) => {
        const isCompleted = !!task.completed_at;
        const canManage   = !disabled && canManageTask(task);
        const isEditing   = editingId === task.id;

        if (isEditing) {
          return (
            <div key={task.id} className="rounded-md border bg-muted/30 p-2 space-y-2">
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate(task);
                  if (e.key === 'Escape') cancelEdit();
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem responsável</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.employee_id} value={m.employee_id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DatePicker
                  value={editDueDate}
                  onChange={setEditDueDate}
                  placeholder="Prazo"
                  className="h-7 text-xs flex-1"
                />
              </div>
              <div className="flex gap-1.5 justify-end">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleUpdate(task)}
                  disabled={updateTask.isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        }

        const assigneeName = task.assignee?.nome ?? '';
        const initials = assigneeName
          .split(' ')
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase();

        return (
          <div key={task.id} className="flex items-start gap-2 py-1 group">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => handleToggle(task)}
              disabled={disabled || toggleTask.isPending}
              className="mt-0.5 shrink-0"
            />

            <span className={cn(
              'text-sm flex-1 leading-snug break-words min-w-0',
              isCompleted && 'line-through text-muted-foreground'
            )}>
              {task.description}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
              {task.due_date && (
                <span className={cn(
                  'text-xs tabular-nums',
                  !isCompleted && task.due_date < new Date().toISOString().split('T')[0]
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}>
                  {fmtDate(task.due_date)}
                </span>
              )}

              {task.assignee && (
                <Avatar className="h-5 w-5 text-[9px]">
                  <AvatarImage src={task.assignee.foto_url ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              )}

              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                    onClick={() => startEdit(task)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(task)}
                    disabled={deleteTask.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Add form ── */}
      {!disabled && (
        <div className="pt-2 space-y-2 border-t mt-2">
          <Input
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
            placeholder="Nova tarefa..."
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <div className="flex gap-2">
            <Select value={addAssigneeId} onValueChange={setAddAssigneeId}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem responsável</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.employee_id} value={m.employee_id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              value={addDueDate}
              onChange={setAddDueDate}
              placeholder="Prazo"
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-7 px-2 shrink-0"
              onClick={handleCreate}
              disabled={!addDesc.trim() || createTask.isPending}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
