import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { cn } from '@/lib/utils';
import {
  getLeverLabel,
  type ProspectActivityWithOwner,
  type ProspectWithCompany,
} from '@/types/prospect';
import { ProspectActivityItem } from './ProspectActivityItem';

interface ProspectActivityTimelineProps {
  prospect: ProspectWithCompany;
  activities: ProspectActivityWithOwner[];
  isLoading: boolean;
  podeEditar: boolean;
}

/** O histórico de atividades: é daqui que sai toda métrica do módulo. */
export function ProspectActivityTimeline({
  prospect,
  activities,
  isLoading,
  podeEditar,
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
          <ProspectActivityItem
            activity={atividade}
            prospectId={prospect.id}
            autorNome={atividade.owner_id ? byId.get(atividade.owner_id)?.nome : undefined}
            podeEditar={podeEditar}
          />
        </li>
      ))}

      <li className="relative pl-8">
        <Marcador semFio />
        <p className="py-1 text-xs text-muted-foreground">
          Registro criado em {formatarData(prospect.created_at.slice(0, 10))}
          {prospect.lever ? ` · origem ${getLeverLabel(prospect.lever)}` : ''}
        </p>
      </li>
    </ol>
  );
}

/**
 * O ponto e o fio da linha do tempo. Só o mais recente vem preenchido — é o que o olho
 * procura ao abrir o card.
 */
function Marcador({ destacado = false, semFio = false }: { destacado?: boolean; semFio?: boolean }) {
  return (
    <span aria-hidden="true">
      {/* O último nó não puxa fio: linha que desce para o vazio sugere item que não veio. */}
      {!semFio && <span className="absolute left-[7px] top-4 h-full w-px bg-border" />}
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
