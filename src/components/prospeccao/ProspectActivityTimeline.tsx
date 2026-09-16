import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { getChannelLabel } from '@/lib/interactionChannels';
import { cn } from '@/lib/utils';
import { iniciaisDe } from '@/lib/prospecting/iniciais';
import type { ProspectActivityWithOwner, ProspectWithCompany } from '@/types/prospect';

interface ProspectActivityTimelineProps {
  prospect: ProspectWithCompany;
  activities: ProspectActivityWithOwner[];
  isLoading: boolean;
}

/** O histórico de atividades: é daqui que sai toda métrica do módulo. */
export function ProspectActivityTimeline({
  prospect,
  activities,
  isLoading,
}: ProspectActivityTimelineProps) {
  const { byId } = useEmployeeDirectoryMap();

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Carregando atividades">
        {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <ol className="relative space-y-3">
      {activities.length === 0 && (
        <li className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma atividade registrada ainda.
        </li>
      )}

      {activities.map((atividade, indice) => (
        <li key={atividade.id} className="relative pl-8">
          <Marcador destacado={indice === 0} />
          <article className="rounded-lg border bg-card p-3 shadow-sm">
            <header className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold">Atividade nº {atividade.sequence_no}</h4>
              <Badge variant="outline" className="font-normal">
                {getChannelLabel(atividade.channel)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'font-normal',
                  atividade.got_response
                    ? 'border-transparent bg-success-subtle text-success-emphasis'
                    : 'border-transparent bg-muted text-muted-foreground',
                )}
              >
                {atividade.got_response ? 'Teve resposta' : 'Sem resposta'}
              </Badge>
              <time className="ml-auto text-xs text-muted-foreground" dateTime={atividade.activity_date}>
                {formatarData(atividade.activity_date)}
              </time>
            </header>

            {atividade.notes && <p className="mt-2 text-sm">{atividade.notes}</p>}

            {atividade.owner_id && byId.get(atividade.owner_id) && (
              <footer className="mt-3 flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px]">
                    {iniciaisDe(byId.get(atividade.owner_id)!.nome)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {byId.get(atividade.owner_id)!.nome}
                </span>
              </footer>
            )}
          </article>
        </li>
      ))}

      <li className="relative pl-8">
        <Marcador />
        <p className="py-1 text-xs text-muted-foreground">
          Registro criado em {formatarData(prospect.created_at.slice(0, 10))}
          {prospect.lever ? ` · origem ${prospect.lever}` : ''}
        </p>
      </li>
    </ol>
  );
}

/**
 * O ponto e o fio da linha do tempo. Só o mais recente vem preenchido — é o que o olho
 * procura ao abrir o card.
 */
function Marcador({ destacado = false }: { destacado?: boolean }) {
  return (
    <span aria-hidden="true">
      <span className="absolute left-[7px] top-4 h-full w-px bg-border" />
      <span
        className={cn(
          'absolute left-0 top-2 h-3.5 w-3.5 rounded-full border-2 bg-background',
          destacado ? 'border-primary bg-primary' : 'border-border',
        )}
      />
    </span>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
