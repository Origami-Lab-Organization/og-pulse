import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useCreateProspectTask } from '@/hooks/useProspectTasks';
import type { ProspectWithCompany } from '@/types/prospect';

interface ProspectTaskComposerProps {
  prospect: ProspectWithCompany;
}

/**
 * A caixa de nova tarefa, no rodapé — mesmo lugar do compositor de registros.
 *
 * Texto e data de conclusão são obrigatórios: tarefa sem data não entra na conta de vencida
 * e some da atenção de quem conduz o contato.
 */
export function ProspectTaskComposer({ prospect }: ProspectTaskComposerProps) {
  const criar = useCreateProspectTask();
  const [texto, setTexto] = useState('');
  const [data, setData] = useState('');

  const ocupado = criar.isPending;
  const podeCriar = texto.trim().length > 0 && !!data && !ocupado;

  const criarTarefa = async () => {
    if (!podeCriar) return;
    await criar.mutateAsync({ prospect_id: prospect.id, description: texto.trim(), due_date: data });
    setTexto('');
    setData('');
    toast({ title: 'Tarefa criada' });
  };

  return (
    <div className="rounded-lg border bg-card p-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') criarTarefa().catch(() => undefined);
        }}
        rows={2}
        placeholder="O que precisa ser feito?"
        aria-label="O que precisa ser feito?"
        className="resize-none border-0 p-2 shadow-none focus-visible:ring-0"
        disabled={ocupado}
      />

      <div className="flex flex-wrap items-center gap-2 border-t px-2 pt-2">
        <label htmlFor="prospect-task-due" className="text-xs text-muted-foreground">
          Concluir até
        </label>
        <Input
          id="prospect-task-due"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="h-8 w-40"
          disabled={ocupado}
        />

        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={!podeCriar}
          onClick={() => criarTarefa().catch(() => undefined)}
        >
          {ocupado ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          )}
          Adicionar tarefa
        </Button>
      </div>
    </div>
  );
}
