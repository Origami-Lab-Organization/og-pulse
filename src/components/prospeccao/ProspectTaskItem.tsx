import { useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteProspectTask, useUpdateProspectTask } from '@/hooks/useProspectTasks';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import { cn } from '@/lib/utils';
import { isTaskOverdue, type ProspectTaskDB } from '@/types/prospect';

interface ProspectTaskItemProps {
  task: ProspectTaskDB;
  responsavelNome?: string;
  podeEditar: boolean;
}

/** Uma tarefa: marcar como feita é um clique; vencida ganha borda vermelha. */
export function ProspectTaskItem({ task, responsavelNome, podeEditar }: ProspectTaskItemProps) {
  const { employee } = useAuth();
  const atualizar = useUpdateProspectTask();
  const excluir = useDeleteProspectTask();
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <EditorDeTarefa task={task} onFechar={() => setEditando(false)} />;
  }

  const concluida = !!task.done_at;
  const vencida = isTaskOverdue(task);

  const alternar = (marcada: boolean) =>
    atualizar.mutate({
      prospect_id: task.prospect_id,
      input: {
        id: task.id,
        done_at: marcada ? new Date().toISOString() : null,
        done_by: marcada ? employee?.id ?? null : null,
      },
    });

  return (
    <article
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm',
        vencida && 'border-destructive',
        concluida && 'bg-muted/40',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={concluida}
          onCheckedChange={(v) => alternar(v === true)}
          disabled={!podeEditar || atualizar.isPending}
          aria-label={concluida ? 'Marcar como pendente' : 'Marcar como concluída'}
          className="mt-0.5"
        />

        <p
          className={cn(
            'min-w-0 flex-1 whitespace-pre-wrap text-sm',
            concluida && 'text-muted-foreground line-through',
          )}
        >
          {task.description}
        </p>

        {podeEditar && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label="Editar tarefa"
              onClick={() => setEditando(true)}
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              aria-label="Excluir tarefa"
              disabled={excluir.isPending}
              onClick={() => excluir.mutate({ id: task.id, prospect_id: task.prospect_id })}
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 text-xs text-muted-foreground">
        <time
          dateTime={task.due_date}
          className={cn(vencida && 'font-medium text-destructive')}
        >
          {descreverVencimento(task)}
        </time>
        {responsavelNome && (
          <span className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">{iniciaisDe(responsavelNome)}</AvatarFallback>
            </Avatar>
            {responsavelNome}
          </span>
        )}
      </footer>
    </article>
  );
}

function EditorDeTarefa({ task, onFechar }: { task: ProspectTaskDB; onFechar: () => void }) {
  const atualizar = useUpdateProspectTask();
  const [texto, setTexto] = useState(task.description);
  const [data, setData] = useState(task.due_date);

  const podeSalvar = texto.trim().length > 0 && !!data && !atualizar.isPending;

  const salvar = async () => {
    if (!podeSalvar) return;
    await atualizar.mutateAsync({
      prospect_id: task.prospect_id,
      input: { id: task.id, description: texto.trim(), due_date: data },
    });
    onFechar();
  };

  return (
    <article className="space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        aria-label="Descrição da tarefa"
        disabled={atualizar.isPending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="h-8 w-40"
          aria-label="Data de conclusão"
          disabled={atualizar.isPending}
        />
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onFechar} disabled={atualizar.isPending}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={salvar} disabled={!podeSalvar}>
            {atualizar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Salvar
          </Button>
        </div>
      </div>
    </article>
  );
}

function descreverVencimento(task: ProspectTaskDB): string {
  const data = formatarData(task.due_date);
  if (task.done_at) return `Concluída em ${formatarData(task.done_at.slice(0, 10))} · prazo ${data}`;

  const dias = diasAte(task.due_date);
  if (dias === 0) return `Vence hoje · ${data}`;
  if (dias === 1) return `Vence amanhã · ${data}`;
  if (dias > 1) return `Vence em ${data} · ${dias} dias`;
  return `Venceu em ${data} · há ${Math.abs(dias)} ${dias === -1 ? 'dia' : 'dias'}`;
}

function diasAte(iso: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
