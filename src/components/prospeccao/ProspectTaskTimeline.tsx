import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { cn } from '@/lib/utils';
import { isTaskOverdue, sortProspectTasks, type ProspectTaskDB } from '@/types/prospect';
import { ProspectTaskItem } from './ProspectTaskItem';

interface ProspectTaskTimelineProps {
  tasks: ProspectTaskDB[];
  isLoading: boolean;
  podeEditar: boolean;
}

/** O que falta fazer com o contato, da data mais próxima para a mais distante. */
export function ProspectTaskTimeline({ tasks, isLoading, podeEditar }: ProspectTaskTimelineProps) {
  const { byId } = useEmployeeDirectoryMap();

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Carregando tarefas">
        {[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma tarefa por aqui. Anote abaixo o próximo passo com este contato.
      </p>
    );
  }

  const ordenadas = sortProspectTasks(tasks);

  return (
    <ol className="relative space-y-3">
      {ordenadas.map((tarefa, indice) => (
        <li key={tarefa.id} className="relative pl-8">
          <Marcador tarefa={tarefa} ultimo={indice === ordenadas.length - 1} />
          <ProspectTaskItem
            task={tarefa}
            responsavelNome={tarefa.owner_id ? byId.get(tarefa.owner_id)?.nome : undefined}
            podeEditar={podeEditar}
          />
        </li>
      ))}
    </ol>
  );
}

/** Concluída vem preenchida; vencida, com contorno vermelho — o olho acha as duas sem ler. */
function Marcador({ tarefa, ultimo }: { tarefa: ProspectTaskDB; ultimo: boolean }) {
  return (
    <span aria-hidden="true">
      {!ultimo && <span className="absolute left-[7px] top-4 h-full w-px bg-border" />}
      <span
        className={cn(
          'absolute left-0 top-3 h-3.5 w-3.5 rounded-full border-2 bg-background',
          tarefa.done_at
            ? 'border-primary bg-primary'
            : isTaskOverdue(tarefa)
              ? 'border-destructive'
              : 'border-border',
        )}
      />
    </span>
  );
}
