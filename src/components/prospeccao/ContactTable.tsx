import type { KeyboardEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Instagram, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import type { ContactRow, ContactSort, ContactSortKey } from '@/lib/prospecting/contactList';
import { nomeCurto } from '@/lib/prospecting/iniciais';
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import { cn } from '@/lib/utils';
import { getProspectStageColor, getProspectStageLabel } from '@/types/prospect';
import { ResponsavelAvatar } from './CompanyBadges';

interface ContactTableProps {
  rows: ContactRow[];
  sort: ContactSort;
  onSort: (key: ContactSortKey) => void;
  onOpen: (row: ContactRow) => void;
}

/** Mesmo grid no cabeçalho e nas linhas: é o que mantém as colunas alinhadas sem <table>. */
const GRADE =
  'grid grid-cols-[minmax(220px,1.8fr)_minmax(170px,1.4fr)_minmax(140px,1fr)_minmax(200px,1.4fr)_140px_170px_minmax(140px,1fr)] items-center gap-x-4 px-5';

export function ContactTable(props: ContactTableProps) {
  const { rows, sort, onSort, onOpen } = props;
  return (
    <div role="table" aria-label="Contatos" className="min-w-[1180px]">
      <div role="rowgroup">
        <div role="row" className={cn(GRADE, 'h-10 border-b bg-muted/40 text-[12.5px] font-medium text-muted-foreground')}>
          <Cabecalho chave="name" sort={sort} onSort={onSort}>Contato</Cabecalho>
          <Cabecalho chave="company" sort={sort} onSort={onSort}>Empresa</Cabecalho>
          <div role="columnheader">Cargo</div>
          <div role="columnheader">E-mail</div>
          <div role="columnheader">Telefone</div>
          <div role="columnheader">Pipeline</div>
          <div role="columnheader">Responsável</div>
        </div>
      </div>
      <div role="rowgroup">
        {rows.map((row) => (
          <Linha key={row.contact.id} row={row} onOpen={() => onOpen(row)} />
        ))}
      </div>
    </div>
  );
}

interface CabecalhoProps {
  chave: ContactSortKey;
  sort: ContactSort;
  onSort: (key: ContactSortKey) => void;
  children: ReactNode;
}

function Cabecalho(props: CabecalhoProps) {
  const { chave, sort, onSort, children } = props;
  const ativo = sort.key === chave;
  const Icone = !ativo ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  const ordem = sort.dir === 1 ? 'ascending' : 'descending';
  return (
    <div role="columnheader" aria-sort={ativo ? ordem : 'none'}>
      <button
        type="button"
        onClick={() => onSort(chave)}
        className="-mx-1 inline-flex select-none items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        <Icone className={cn('h-3.5 w-3.5', !ativo && 'opacity-35')} aria-hidden="true" />
      </button>
    </div>
  );
}

function Linha({ row, onOpen }: { row: ContactRow; onOpen: () => void }) {
  const { contact } = row;
  const abrirPeloTeclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="row"
      tabIndex={0}
      aria-label={`Abrir ${contact.name}`}
      onClick={onOpen}
      onKeyDown={abrirPeloTeclado}
      className={cn(
        GRADE,
        'group h-[58px] cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      )}
    >
      <div role="cell" className="min-w-0"><CelulaContato row={row} /></div>
      <div role="cell" className="min-w-0"><Texto valor={contact.company?.name} /></div>
      <div role="cell" className="min-w-0"><Texto valor={contact.role} /></div>
      <div role="cell" className="min-w-0"><Texto valor={contact.email} /></div>
      <div role="cell" className="min-w-0"><Texto valor={contact.phone} /></div>
      <div role="cell" className="min-w-0"><CelulaPipeline row={row} /></div>
      <div role="cell" className="min-w-0"><CelulaResponsavel ownerId={row.aberto?.owner_id ?? null} /></div>
    </div>
  );
}

function CelulaContato({ row }: { row: ContactRow }) {
  const { contact } = row;
  const links = [
    { href: contact.linkedin_url ? comProtocolo(contact.linkedin_url) : null, icone: Linkedin, rotulo: 'LinkedIn' },
    { href: urlDoInstagram(contact.instagram_url), icone: Instagram, rotulo: 'Instagram' },
  ].filter((l): l is { href: string; icone: typeof Linkedin; rotulo: string } => !!l.href);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span title={contact.name} className="truncate text-sm font-medium underline-offset-[3px] group-hover:underline">
        {contact.name}
      </span>
      {links.length > 0 && (
        <span className="flex h-[15px] items-center gap-2">
          {links.map(({ href, icone: Icone, rotulo }) => (
            <a
              key={rotulo}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={rotulo}
              aria-label={`${rotulo} de ${contact.name}`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex rounded-sm text-muted-foreground hover:text-success-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icone className="h-[13px] w-[13px]" aria-hidden="true" />
            </a>
          ))}
        </span>
      )}
    </div>
  );
}

/** Em andamento: a etapa. Fora: o último desfecho, para saber de onde a conversa parou. */
function CelulaPipeline({ row }: { row: ContactRow }) {
  if (row.aberto) {
    return (
      <Badge variant="secondary" className={cn('font-normal', getProspectStageColor(row.aberto.stage))}>
        {getProspectStageLabel(row.aberto.stage)}
      </Badge>
    );
  }
  return (
    <span className="flex flex-col gap-[3px] text-[13px] text-muted-foreground">
      <span>Fora do Pipeline</span>
      {row.ultimo && <span className="text-xs">Último: {getProspectStageLabel(row.ultimo.stage)}</span>}
    </span>
  );
}

function CelulaResponsavel({ ownerId }: { ownerId: string | null }) {
  const { byId } = useEmployeeDirectoryMap();
  const nome = ownerId ? byId.get(ownerId)?.nome : undefined;
  if (!ownerId || !nome) return <Vazio />;
  return (
    <span className="flex min-w-0 items-center gap-2" title={nome}>
      <ResponsavelAvatar id={ownerId} nome={nome} />
      <span className="truncate text-[13.5px]">{nomeCurto(nome)}</span>
    </span>
  );
}

function Texto({ valor }: { valor?: string | null }) {
  if (!valor) return <Vazio />;
  return <span title={valor} className="block truncate text-[13.5px]">{valor}</span>;
}

function Vazio() {
  return <span className="text-muted-foreground/60" aria-label="Não informado">—</span>;
}
