import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { usePendingProspectTasks } from '@/hooks/useProspectTasks';
import { cn } from '@/lib/utils';
import {
  describeOpportunityContacts,
  getProspectStageColor,
  getProspectStageLabel,
  isTaskOverdue,
  type PendingTaskLite,
  type ProspectWithCompany,
} from '@/types/prospect';

interface CompanyOpportunityListProps {
  opportunities: ProspectWithCompany[];
  onOpenOpportunity: (prospect: ProspectWithCompany) => void;
}

/** As oportunidades de uma empresa (09/10/2026): em que etapa, com quem dela e com quem do time. */
export function CompanyOpportunityList({ opportunities, onOpenOpportunity }: CompanyOpportunityListProps) {
  const { byId } = useEmployeeDirectoryMap();
  const { porContato: porOportunidade } = usePendingProspectTasks();

  if (opportunities.length === 0) {
    return <p className="py-3 text-[13.5px] text-muted-foreground">Nenhuma oportunidade nesta empresa.</p>;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {opportunities.map((oportunidade) => (
        <li key={oportunidade.id}>
          <LinhaDeOportunidade
            oportunidade={oportunidade}
            responsavel={oportunidade.owner_id ? byId.get(oportunidade.owner_id)?.nome : undefined}
            tarefa={porOportunidade.get(oportunidade.id)}
            onOpen={() => onOpenOpportunity(oportunidade)}
          />
        </li>
      ))}
    </ul>
  );
}

interface LinhaDeOportunidadeProps {
  oportunidade: ProspectWithCompany;
  responsavel?: string;
  /** A próxima tarefa pendente — o único prazo que avisa vencimento (28/09/2026). */
  tarefa?: PendingTaskLite;
  onOpen: () => void;
}

function LinhaDeOportunidade(props: LinhaDeOportunidadeProps) {
  const { oportunidade, responsavel, tarefa, onOpen } = props;
  const vencida = !!tarefa && isTaskOverdue({ due_date: tarefa.due_date, done_at: null });
  const detalhe = detalheDa(oportunidade, responsavel);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn('font-normal', getProspectStageColor(oportunidade.stage))}>
            {getProspectStageLabel(oportunidade.stage)}
          </Badge>
          <span className="text-xs text-muted-foreground">aberta em {formatarData(oportunidade.created_at.slice(0, 10))}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{detalhe}</p>
        {tarefa && (
          <p className={cn('truncate text-xs', vencida ? 'font-medium text-destructive' : 'text-muted-foreground')} title={tarefa.description}>
            {vencida ? 'Tarefa venceu em' : 'Próxima tarefa em'} {formatarData(tarefa.due_date)}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

/** Com quem da empresa e com quem do time. */
function detalheDa(oportunidade: ProspectWithCompany, responsavel?: string): string {
  const pessoas = describeOpportunityContacts(oportunidade) ?? 'Sem contato';
  return responsavel ? `${pessoas} · com ${responsavel}` : pessoas;
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
