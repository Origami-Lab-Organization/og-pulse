import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { cn } from '@/lib/utils';
import {
  getProspectStageColor,
  getProspectStageLabel,
  isOverdue,
  type ProspectWithCompany,
} from '@/types/prospect';

interface CompanyContactListProps {
  contacts: ProspectWithCompany[];
  onOpenContact: (prospect: ProspectWithCompany) => void;
}

/** Os contatos de uma empresa: quem é, em que etapa está e com quem do time. */
export function CompanyContactList({ contacts, onOpenContact }: CompanyContactListProps) {
  const { byId } = useEmployeeDirectoryMap();

  if (contacts.length === 0) {
    return <p className="py-3 text-[13.5px] text-muted-foreground">Nenhum contato cadastrado nesta empresa.</p>;
  }

  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {contacts.map((contato) => (
        <li key={contato.id}>
          <LinhaDeContato
            contato={contato}
            responsavel={contato.owner_id ? byId.get(contato.owner_id)?.nome : undefined}
            onOpen={() => onOpenContact(contato)}
          />
        </li>
      ))}
    </ul>
  );
}

function LinhaDeContato({
  contato,
  responsavel,
  onOpen,
}: {
  contato: ProspectWithCompany;
  responsavel?: string;
  onOpen: () => void;
}) {
  const atrasado = isOverdue(contato);
  const detalhe = [contato.contact_role, responsavel && `com ${responsavel}`].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{contato.contact_name}</span>
          <Badge variant="secondary" className={cn('font-normal', getProspectStageColor(contato.stage))}>
            {getProspectStageLabel(contato.stage)}
          </Badge>
        </div>
        {detalhe && <p className="truncate text-xs text-muted-foreground">{detalhe}</p>}
        {contato.next_activity_on && (
          <p className={cn('text-xs', atrasado ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {atrasado ? 'Atividade venceu em' : 'Próxima atividade em'} {formatarData(contato.next_activity_on)}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
