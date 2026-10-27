import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useUpdateProspectTask } from '@/hooks/useProspectTasks';
import { descreverPrazo, diasAte, formatarData } from '@/lib/prospecting/prazos';
import { cn } from '@/lib/utils';
import { toISODate, type ProspectTaskDB } from '@/types/prospect';

interface OpportunityNextTaskProps {
  tarefa: ProspectTaskDB;
  podeEditar: boolean;
}

/**
 * A próxima tarefa pendente em destaque, no topo do centro da ficha (28/09/2026; desde
 * 09/10/2026 com "Reagendar" e "Concluir" ali mesmo, sem ir à aba Tarefas). É a única data que
 * avisa vencimento: a da cadência é sugestão, a tarefa é compromisso de alguém do time.
 * Vermelho só quando venceu — no prazo, é informação, não alerta.
 */
export function OpportunityNextTask(props: OpportunityNextTaskProps) {
  const { tarefa, podeEditar } = props;
  const dias = diasAte(tarefa.due_date);
  const vencida = dias < 0;

  return (
    // Faixa compacta (27/10/2026): o bloco grande, todo em vermelho, pesava mais que a conversa.
    // O vermelho ficou no rótulo e na borda da esquerda.
    <div
      role={vencida ? 'alert' : undefined}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-l-4 px-3 py-2',
        vencida ? 'border-l-destructive bg-destructive-subtle/50' : 'border-l-primary bg-muted/30',
      )}
    >
      <Clock className={cn('h-4 w-4 shrink-0', vencida ? 'text-destructive' : 'text-muted-foreground')} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        <span className={cn('font-medium', vencida ? 'text-destructive' : 'text-muted-foreground')}>
          {vencida ? 'Vencida' : 'Próxima tarefa'} · {formatarData(tarefa.due_date)} ({descreverPrazo(dias)})
        </span>
        <span className="text-muted-foreground"> — </span>
        <span className="break-words text-foreground">{tarefa.description}</span>
      </p>
      {podeEditar && <AcoesDaTarefa tarefa={tarefa} />}
    </div>
  );
}

function AcoesDaTarefa({ tarefa }: { tarefa: ProspectTaskDB }) {
  const { employee } = useAuth();
  const atualizar = useUpdateProspectTask();
  const concluir = () =>
    atualizar.mutate(
      {
        prospect_id: tarefa.prospect_id,
        input: { id: tarefa.id, done_at: new Date().toISOString(), done_by: employee?.id ?? null },
      },
      { onSuccess: () => toast({ title: 'Tarefa concluída' }) },
    );

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Reagendar tarefa={tarefa} />
      <Button size="sm" variant="outline" className="h-8 bg-background" onClick={concluir} disabled={atualizar.isPending}>
        Concluir
      </Button>
    </div>
  );
}

/** Nova data para a mesma tarefa: a partir de hoje — reagendar para trás não resolve nada. */
function Reagendar({ tarefa }: { tarefa: ProspectTaskDB }) {
  const atualizar = useUpdateProspectTask();
  const hoje = toISODate(new Date());
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(tarefa.due_date < hoje ? hoje : tarefa.due_date);
  const idDoCampo = `reagendar-${tarefa.id}`;

  const salvar = () =>
    atualizar.mutate(
      { prospect_id: tarefa.prospect_id, input: { id: tarefa.id, due_date: data } },
      {
        onSuccess: () => {
          setAberto(false);
          toast({ title: 'Tarefa reagendada', description: `Agora vence em ${formatarData(data)}.` });
        },
      },
    );

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8">Reagendar</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={idDoCampo} className="text-xs">Nova data</Label>
          <Input id={idDoCampo} type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
          <Button size="sm" onClick={salvar} disabled={!data || data < hoje || atualizar.isPending}>Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
