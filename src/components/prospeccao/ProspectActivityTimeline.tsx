import { CheckCircle2, Circle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { getChannelLabel } from '@/lib/interactionChannels';
import type { ProspectActivityWithOwner } from '@/types/prospect';

interface ProspectActivityTimelineProps {
  activities: ProspectActivityWithOwner[];
  isLoading: boolean;
}

/** O histórico de atividades: é daqui que sai toda métrica do módulo. */
export function ProspectActivityTimeline({ activities, isLoading }: ProspectActivityTimelineProps) {
  const { byId } = useEmployeeDirectoryMap();

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando atividades">
        {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade registrada ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {activities.map((atividade) => (
        <li key={atividade.id} className="flex gap-3 rounded-md border p-3">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            {atividade.got_response ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">Atividade nº {atividade.sequence_no}</span>
              <span className="text-xs text-muted-foreground">
                {getChannelLabel(atividade.channel)} · {formatarData(atividade.activity_date)}
              </span>
            </span>
            <span className="block text-xs text-muted-foreground">
              {atividade.got_response ? 'Teve resposta' : 'Sem resposta'}
              {atividade.owner_id && byId.get(atividade.owner_id)
                ? ` · ${byId.get(atividade.owner_id)!.nome}`
                : ''}
            </span>
            {atividade.notes && <span className="mt-1 block text-sm">{atividade.notes}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
