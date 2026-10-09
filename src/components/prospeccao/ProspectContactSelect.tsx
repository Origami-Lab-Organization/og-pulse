import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, UserRound, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSearchProspectContacts } from '@/hooks/useProspectContacts';
import { cn } from '@/lib/utils';
import {
  getProspectStageColor,
  getProspectStageLabel,
  type ProspectContactWithCompany,
  type ProspectWithCompany,
} from '@/types/prospect';

interface ProspectContactSelectProps {
  value: ProspectContactWithCompany | null;
  onChange: (contact: ProspectContactWithCompany | null) => void;
  /** Ninguém serve: abre o cadastro da pessoa com o nome que foi digitado. */
  onCreateNew: (nome: string) => void;
  /** Oportunidade em andamento de cada pessoa — a busca mostra quem já está no Pipeline. */
  openCards?: Map<string, ProspectWithCompany>;
  /** Pessoas que não podem ser escolhidas de novo — as que já estão na oportunidade. */
  excluir?: ReadonlySet<string>;
  /** Texto do botão quando nada foi escolhido. */
  placeholder?: string;
  disabled?: boolean;
}

const SEM_CARDS = new Map<string, ProspectWithCompany>();

/**
 * Escolhe a pessoa como se escolhe a empresa (01/10/2026, ADR-0045): digita algumas letras do
 * nome, do e-mail ou do LinkedIn, e quem já está cadastrado aparece antes da opção de cadastrar.
 * A ordem é a da deduplicação: o que já existe vem antes do que se cria.
 */
export function ProspectContactSelect(props: ProspectContactSelectProps) {
  const { value, onChange, onCreateNew, openCards = SEM_CARDS, excluir, placeholder, disabled } = props;
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const termo = busca.trim();

  const escolher = (contato: ProspectContactWithCompany) => {
    onChange(contato);
    setOpen(false);
  };
  const cadastrar = () => {
    onCreateNew(termo);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 w-full justify-between px-3 font-normal"
          disabled={disabled}
        >
          <span className={cn('flex items-center gap-2 truncate text-sm', !value && 'text-muted-foreground')}>
            <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {value?.name ?? placeholder ?? 'Buscar contato por nome, e-mail ou LinkedIn'}
          </span>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {value && (
              <X
                className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
                aria-label="Limpar contato"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4} collisionPadding={8}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Nome, e-mail ou LinkedIn..." value={busca} onValueChange={setBusca} />
          <CommandList className="max-h-72 overflow-y-auto">
            {termo.length < 2 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">Digite ao menos 2 letras.</div>
            ) : (
              <Resultados
                termo={termo}
                selecionado={value}
                openCards={openCards}
                excluir={excluir}
                onEscolher={escolher}
                onCadastrar={cadastrar}
              />
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Resultados(props: {
  termo: string;
  selecionado: ProspectContactWithCompany | null;
  openCards: Map<string, ProspectWithCompany>;
  excluir?: ReadonlySet<string>;
  onEscolher: (contato: ProspectContactWithCompany) => void;
  onCadastrar: () => void;
}) {
  const { termo, selecionado, openCards, excluir, onEscolher, onCadastrar } = props;
  const { contatos: encontrados, buscando } = useResultados(termo);
  const contatos = excluir ? encontrados.filter((c) => !excluir.has(c.id)) : encontrados;
  const homonimo = contatos.some((c) => c.name.trim().toLowerCase() === termo.toLowerCase());

  return (
    <>
      {buscando && <div className="px-3 py-4 text-sm text-muted-foreground">Buscando...</div>}
      {!buscando && contatos.length === 0 && <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>}
      <GrupoContatos contatos={contatos} selecionado={selecionado} openCards={openCards} onEscolher={onEscolher} />
      <CommandGroup>
        <CommandItem value={`__novo__${termo}`} onSelect={onCadastrar}>
          <Plus className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          {/* Homônimo é legítimo, mas a pessoa precisa ver que está criando OUTRO. */}
          {homonimo ? <>Cadastrar outro &ldquo;{termo}&rdquo;</> : <>Cadastrar &ldquo;{termo}&rdquo;</>}
        </CommandItem>
      </CommandGroup>
    </>
  );
}

function useResultados(termo: string) {
  const { data: contatos = [], isLoading, isFetching } = useSearchProspectContacts(termo);
  // A busca espera a digitação parar: até lá, a lista anterior não pode passar por "nenhum".
  return { contatos, buscando: isLoading || (isFetching && contatos.length === 0) };
}

function GrupoContatos(props: {
  contatos: ProspectContactWithCompany[];
  selecionado: ProspectContactWithCompany | null;
  openCards: Map<string, ProspectWithCompany>;
  onEscolher: (contato: ProspectContactWithCompany) => void;
}) {
  const { contatos, selecionado, openCards, onEscolher } = props;
  if (contatos.length === 0) return null;
  return (
    <CommandGroup heading="Contatos cadastrados">
      {contatos.map((contato) => (
        <CommandItem key={contato.id} value={contato.id} onSelect={() => onEscolher(contato)}>
          <Check
            className={cn('mr-2 h-4 w-4 shrink-0', selecionado?.id === contato.id ? 'opacity-100' : 'opacity-0')}
            aria-hidden="true"
          />
          <LinhaDoContato contato={contato} card={openCards.get(contato.id)} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function LinhaDoContato({ contato, card }: { contato: ProspectContactWithCompany; card?: ProspectWithCompany }) {
  const detalhe = [contato.company?.name, contato.role, contato.email].filter(Boolean).join(' · ');
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{contato.name}</span>
        {detalhe && <span className="truncate text-xs text-muted-foreground">{detalhe}</span>}
      </span>
      {card && (
        <Badge variant="secondary" className={cn('shrink-0 font-normal', getProspectStageColor(card.stage))}>
          {getProspectStageLabel(card.stage)}
        </Badge>
      )}
    </span>
  );
}
