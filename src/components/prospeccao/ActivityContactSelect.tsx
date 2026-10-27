import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { sortOpportunityContacts, type ProspectOpportunityContact } from '@/types/prospect';

/** O Radix não aceita item com valor vazio: "sem contato" precisa de um valor próprio. */
const SEM_CONTATO = 'sem_contato';
/** Não é uma pessoa: escolher abre o cadastro, e o valor do campo não muda. */
const NOVO_CONTATO = 'novo_contato';

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
  /** Presente, a lista termina em "Novo contato", que chama isto (27/10/2026). */
  onNovoContato?: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Com quem foi a atividade (09/10/2026). OPCIONAL de propósito: o registro de um clique é o
 * que mantém o quadro vivo, e marcar a pessoa é detalhe que ajuda quem lê depois.
 * Sem contatos na oportunidade, o campo só aparece se der para cadastrar alguém ali mesmo.
 */
export function ActivityContactSelect(props: ActivityContactSelectProps) {
  const { contatos, value, onChange, atual, onNovoContato, disabled, className, id } = props;
  const opcoes = opcoesDe(contatos, atual);
  if (opcoes.length === 0 && !onNovoContato) return null;

  const escolher = (v: string) => {
    if (v === NOVO_CONTATO) {
      onNovoContato?.();
      return;
    }
    onChange(v === SEM_CONTATO ? null : v);
  };

  return (
    <Select value={value ?? SEM_CONTATO} onValueChange={escolher} disabled={disabled}>
      {/* Sem ícone (27/10/2026): o span em volta do valor quebrava a linha e desalinhava do canal. */}
      <SelectTrigger id={id} className={cn('h-8 w-44', className)} aria-label="Com quem foi a atividade">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SEM_CONTATO}>Sem contato</SelectItem>
        {opcoes.map((o) => (
          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
        ))}
        {onNovoContato && (
          <>
            <SelectSeparator />
            <SelectItem value={NOVO_CONTATO} className="text-primary focus:text-primary">
              <span className="flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Novo contato
              </span>
            </SelectItem>
          </>
        )}
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
