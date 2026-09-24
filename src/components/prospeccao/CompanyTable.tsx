import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Globe, Instagram, Linkedin, Users } from 'lucide-react';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import {
  descreverProximaAtividade,
  type CompanySort,
  type CompanySortKey,
} from '@/lib/prospecting/companyList';
import { COMPANY_STATUS_META, type CompanyRow } from '@/lib/prospecting/companyStatus';
import { nomeCurto } from '@/lib/prospecting/iniciais';
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import { cn } from '@/lib/utils';
import {
  AbordagemBadge,
  AnelBadge,
  ResponsavelAvatar,
  SituacaoDot,
  TierBadge,
} from './CompanyBadges';

interface CompanyTableProps {
  rows: CompanyRow[];
  sort: CompanySort;
  onSort: (key: CompanySortKey) => void;
  onOpen: (row: CompanyRow) => void;
}

/** Mesmo grid no cabeçalho e nas linhas: é o que mantém as colunas alinhadas sem <table>. */
const GRADE =
  'grid grid-cols-[minmax(250px,2.2fr)_minmax(170px,1.4fr)_60px_60px_124px_minmax(140px,1fr)_80px_minmax(140px,1fr)_124px] items-center gap-x-4 px-5';

export function CompanyTable({ rows, sort, onSort, onOpen }: CompanyTableProps) {
  return (
    <div role="table" aria-label="Empresas" className="min-w-[1180px]">
      <div role="rowgroup">
        <div
          role="row"
          className={cn(GRADE, 'h-10 border-b bg-muted/40 text-[12.5px] font-medium text-muted-foreground')}
        >
          <Cabecalho chave="name" sort={sort} onSort={onSort}>Empresa</Cabecalho>
          <div role="columnheader">Setor</div>
          <Cabecalho chave="anel" sort={sort} onSort={onSort} centro titulo="Proximidade geográfica / relacional">
            Anel
          </Cabecalho>
          <Cabecalho chave="tier" sort={sort} onSort={onSort} centro titulo="Prioridade da conta">
            Tier
          </Cabecalho>
          <div role="columnheader">Abordagem</div>
          <div role="columnheader">Situação</div>
          <div role="columnheader" className="text-center">Contatos</div>
          <div role="columnheader">Responsável</div>
          <Cabecalho chave="next" sort={sort} onSort={onSort}>Próx. atividade</Cabecalho>
        </div>
      </div>

      <div role="rowgroup">
        {rows.map((row) => (
          <Linha key={row.company.id} row={row} onOpen={() => onOpen(row)} />
        ))}
      </div>
    </div>
  );
}

function Cabecalho({
  chave,
  sort,
  onSort,
  centro = false,
  titulo,
  children,
}: {
  chave: CompanySortKey;
  sort: CompanySort;
  onSort: (key: CompanySortKey) => void;
  centro?: boolean;
  titulo?: string;
  children: ReactNode;
}) {
  const ativo = sort.key === chave;
  const Icone = !ativo ? ChevronsUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  const ordem = sort.dir === 1 ? 'ascending' : 'descending';
  return (
    <div role="columnheader" aria-sort={ativo ? ordem : 'none'} className={cn(centro && 'flex justify-center')}>
      <button
        type="button"
        title={titulo}
        onClick={() => onSort(chave)}
        className="-mx-1 inline-flex select-none items-center gap-1 rounded-sm px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        <Icone className={cn('h-3.5 w-3.5', !ativo && 'opacity-35')} aria-hidden="true" />
      </button>
    </div>
  );
}

function Linha({ row, onOpen }: { row: CompanyRow; onOpen: () => void }) {
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
      aria-label={`Abrir ${row.company.name}`}
      onClick={onOpen}
      onKeyDown={abrirPeloTeclado}
      className={cn(
        GRADE,
        'group h-[58px] cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
      )}
    >
      <div role="cell" className="min-w-0"><CelulaEmpresa row={row} /></div>
      <div role="cell" className="min-w-0"><CelulaSetor row={row} /></div>
      <div role="cell" className="flex justify-center">
        {row.anel ? <AnelBadge anel={row.anel} /> : <Vazio />}
      </div>
      <div role="cell" className="flex justify-center">
        {row.tier ? <TierBadge tier={row.tier} /> : <Vazio />}
      </div>
      <div role="cell"><AbordagemBadge status={row.status} /></div>
      <div role="cell" className="min-w-0" title={COMPANY_STATUS_META[row.status].hint}>
        <span className="flex items-center gap-2 text-[13.5px]">
          <SituacaoDot status={row.status} />
          <span className="truncate">{COMPANY_STATUS_META[row.status].label}</span>
        </span>
      </div>
      <div
        role="cell"
        className={cn(
          'flex items-center justify-center gap-1.5 text-[13.5px]',
          row.contacts.length === 0 && 'text-muted-foreground/70',
        )}
      >
        <Users className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        {row.contacts.length}
        <span className="sr-only">{row.contacts.length === 1 ? 'contato' : 'contatos'}</span>
      </div>
      <div role="cell" className="min-w-0"><CelulaResponsavel ownerIds={row.ownerIds} /></div>
      <div role="cell"><CelulaProximaAtividade data={row.nextActivityOn} /></div>
    </div>
  );
}

function CelulaEmpresa({ row }: { row: CompanyRow }) {
  const { company } = row;
  const links = [
    { href: company.website ? comProtocolo(company.website) : null, icone: Globe, rotulo: 'Site' },
    { href: company.linkedin_url ? comProtocolo(company.linkedin_url) : null, icone: Linkedin, rotulo: 'LinkedIn' },
    { href: urlDoInstagram(company.instagram_url), icone: Instagram, rotulo: 'Instagram' },
  ].filter((l): l is { href: string; icone: typeof Globe; rotulo: string } => !!l.href);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        title={company.name}
        className="truncate text-sm font-medium underline-offset-[3px] group-hover:underline"
      >
        {company.name}
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
              aria-label={`${rotulo} de ${company.name}`}
              onClick={pararPropagacao}
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

function CelulaSetor({ row }: { row: CompanyRow }) {
  if (!row.setor) return <span className="text-[12.5px] text-muted-foreground/80">Não segmentada</span>;
  return (
    <div className="flex min-w-0 flex-col gap-[3px]" title={[row.setor, row.subsetor].filter(Boolean).join(' · ')}>
      <span className="truncate text-[13.5px]">{row.setor}</span>
      {row.subsetor && <span className="truncate text-xs text-muted-foreground">{row.subsetor}</span>}
    </div>
  );
}

function CelulaResponsavel({ ownerIds }: { ownerIds: string[] }) {
  const { byId } = useEmployeeDirectoryMap();
  const [primeiro, ...outros] = ownerIds;
  const nome = primeiro ? byId.get(primeiro)?.nome : undefined;
  if (!primeiro || !nome) return <Vazio />;

  const todos = ownerIds.map((id) => byId.get(id)?.nome).filter(Boolean).join(', ');
  return (
    <span className="flex min-w-0 items-center gap-2" title={todos}>
      <ResponsavelAvatar id={primeiro} nome={nome} />
      <span className="truncate text-[13.5px]">{nomeCurto(nome)}</span>
      {outros.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">+{outros.length}</span>}
    </span>
  );
}

const TOM_DA_DATA = {
  atrasada: { rotulo: 'font-medium text-destructive', dica: 'text-destructive' },
  hoje: { rotulo: 'font-semibold text-success-emphasis', dica: 'text-muted-foreground' },
  futura: { rotulo: '', dica: 'text-muted-foreground' },
} as const;

function CelulaProximaAtividade({ data }: { data: string | null }) {
  if (!data) return <Vazio />;
  const { rotulo, dica, tom } = descreverProximaAtividade(data);
  return (
    <time dateTime={data} className="flex flex-col gap-[3px]">
      <span className={cn('text-[13.5px]', TOM_DA_DATA[tom].rotulo)}>{rotulo}</span>
      <span className={cn('text-xs', TOM_DA_DATA[tom].dica)}>{dica}</span>
    </time>
  );
}

function Vazio() {
  return <span className="text-muted-foreground/60" aria-label="Não informado">—</span>;
}

function pararPropagacao(e: MouseEvent) {
  e.stopPropagation();
}
