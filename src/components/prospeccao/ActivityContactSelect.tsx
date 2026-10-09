import { UserRound } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { sortOpportunityContacts, type ProspectOpportunityContact } from '@/types/prospect';

/** O Radix não aceita item com valor vazio: "sem contato" precisa de um valor próprio. */
const SEM_CONTATO = 'sem_contato';

interface ActivityContactSelectProps {
  /** Os contatos da oportunidade — as opções. */
  contatos: ProspectOpportunityContact[];
  value: string | null;
  onChange: (contactId: string | null) => void;
  /**
   * A pessoa já gravada na atividade que saiu da oportunidade depois: continua aparecendo,
   * senão a edição apagaria o "com quem" sem ninguém pedir.
   */
  atual?: { id: string; name: string } | null;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Com quem foi a atividade (09/10/2026). OPCIONAL de propósito: o registro de um clique é o
 * que mantém o quadro vivo, e marcar a pessoa é detalhe que ajuda quem lê depois.
 * Sem contatos na oportunidade, não há o que escolher e o campo não aparece.
 */
export function ActivityContactSelect(props: ActivityContactSelectProps) {
  const { contatos, value, onChange, atual, disabled, className, id } = props;
  const opcoes = opcoesDe(contatos, atual);
  if (opcoes.length === 0) return null;

  return (
    <Select value={value ?? SEM_CONTATO} onValueChange={(v) => onChange(v === SEM_CONTATO ? null : v)} disabled={disabled}>
      <SelectTrigger id={id} className={cn('h-8 w-44', className)} aria-label="Com quem foi a atividade">
        <span className="flex min-w-0 items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_CONTATO}>Sem contato</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function opcoesDe(
  contatos: ProspectOpportunityContact[],
  atual?: { id: string; name: string } | null,
): Array<{ id: string; name: string }> {
  const opcoes = sortOpportunityContacts(contatos)
    .filter((c) => !!c.contact)
    .map((c) => ({ id: c.contact_id, name: c.contact!.name }));
  if (atual && !opcoes.some((o) => o.id === atual.id)) opcoes.push(atual);
  return opcoes;
}
