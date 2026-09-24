import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Copy, Globe, Instagram, Linkedin, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useUpdateProspectCompany } from '@/hooks/useProspectCompanies';
import { descreverProximaAtividade } from '@/lib/prospecting/companyList';
import {
  formatRankInput,
  formatSegmentInput,
  segmentToInput,
} from '@/lib/prospecting/companySegmentation';
import { COMPANY_STATUS_META, type CompanyRow } from '@/lib/prospecting/companyStatus';
import { comProtocolo, urlCurta, urlDoInstagram } from '@/lib/prospecting/links';
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import type { ProspectWithCompany } from '@/types/prospect';
import { AbordagemBadge, SituacaoDot, TierBadge } from './CompanyBadges';
import { CompanyContactList } from './CompanyContactList';

interface CompanyDetailDialogProps {
  row: CompanyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenContact: (prospect: ProspectWithCompany) => void;
}

/**
 * A empresa inteira num lugar só: cadastro, segmentação, situação e contatos.
 *
 * Os dados cadastrais (CNPJ, links) ficam SÓ aqui — a tabela mostra o que serve para
 * decidir de longe, o modal o que serve para agir. Editar aqui edita a empresa, e isso
 * vale para todos os contatos dela.
 */
export function CompanyDetailDialog({ row, open, onOpenChange, onOpenContact }: CompanyDetailDialogProps) {
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (open) setEditando(false);
  }, [open, row?.company.id]);

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-14 flex max-h-[calc(100vh-7rem)] max-w-[600px] translate-y-0 flex-col gap-0 overflow-hidden rounded-[14px] p-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0"
        onEscapeKeyDown={(e) => {
          // Esc sai da edição antes de fechar: a pessoa não perde o modal por engano.
          if (!editando) return;
          e.preventDefault();
          setEditando(false);
        }}
      >
        <Cabecalho row={row} />
        {editando ? (
          <Edicao row={row} onFechar={() => setEditando(false)} />
        ) : (
          <Visualizacao
            row={row}
            onEditar={() => setEditando(true)}
            onFechar={() => onOpenChange(false)}
            onOpenContact={onOpenContact}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Cabecalho({ row }: { row: CompanyRow }) {
  const situacao = COMPANY_STATUS_META[row.status];
  return (
    <DialogHeader className="space-y-3 border-b px-6 pb-[18px] pt-[22px] text-left">
      <div className="space-y-1 pr-8">
        <DialogTitle className="text-[19px] font-semibold leading-[1.3] tracking-[-0.01em]">
          {row.company.name}
        </DialogTitle>
        <DialogDescription className="text-[13px]">
          {row.setor ? [row.setor, row.subsetor].filter(Boolean).join(' · ') : 'Não segmentada'}
        </DialogDescription>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AbordagemBadge status={row.status} comFundo />
        <span className="inline-flex h-[26px] items-center gap-[7px] rounded-full border px-2.5 text-[12.5px]">
          <SituacaoDot status={row.status} />
          {situacao.label}
        </span>
        {row.tier && <TierBadge tier={row.tier} longo />}
        {row.anel && (
          <span className="inline-flex h-[26px] items-center rounded-md border border-input px-2.5 text-xs font-semibold text-foreground/80">
            Anel {row.anel}
          </span>
        )}
      </div>
    </DialogHeader>
  );
}

function Visualizacao({
  row,
  onEditar,
  onFechar,
  onOpenContact,
}: {
  row: CompanyRow;
  onEditar: () => void;
  onFechar: () => void;
  onOpenContact: (prospect: ProspectWithCompany) => void;
}) {
  const { company } = row;
  return (
    <>
      <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto px-6 pb-5 pt-1.5">
        <Secao titulo="Dados cadastrais">
          <Item rotulo="CNPJ">{company.cnpj && <CnpjCopiavel cnpj={company.cnpj} />}</Item>
          <Item rotulo="Site">
            {company.website && <LinkExterno href={comProtocolo(company.website)} icone={Globe} />}
          </Item>
          <Item rotulo="LinkedIn">
            {company.linkedin_url && <LinkExterno href={comProtocolo(company.linkedin_url)} icone={Linkedin} />}
          </Item>
          <Item rotulo="Instagram">
            {company.instagram_url && <LinkExterno href={urlDoInstagram(company.instagram_url)} icone={Instagram} />}
          </Item>
        </Secao>

        <Secao titulo="Segmentação">
          <Item rotulo="Segmento">{row.setor && [row.setor, row.subsetor].filter(Boolean).join(' / ')}</Item>
          <Item rotulo="Anel">{row.anel && `Anel ${row.anel}`}</Item>
          <Item rotulo="Tier">{row.tier && `Tier ${row.tier}`}</Item>
        </Secao>

        <SecaoProspeccao row={row} />

        <Secao titulo={`Contatos · ${row.contacts.length}`}>
          <div className="pt-1">
            <CompanyContactList contacts={row.contacts} onOpenContact={onOpenContact} />
          </div>
        </Secao>
      </div>

      <Rodape>
        <Button variant="outline" onClick={onFechar}>Fechar</Button>
        <Button onClick={onEditar}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Editar dados
        </Button>
      </Rodape>
    </>
  );
}

function SecaoProspeccao({ row }: { row: CompanyRow }) {
  const { byId } = useEmployeeDirectoryMap();
  const situacao = COMPANY_STATUS_META[row.status];
  const responsaveis = row.ownerIds.map((id) => byId.get(id)?.nome).filter(Boolean).join(', ');
  const proxima = row.nextActivityOn ? descreverProximaAtividade(row.nextActivityOn) : null;

  return (
    <Secao titulo="Prospecção">
      <Item rotulo="Situação">{`${situacao.label} — ${minusculaInicial(situacao.hint)}`}</Item>
      <Item rotulo="Responsável">{responsaveis}</Item>
      <Item rotulo="Contatos">
        {row.contacts.length > 0 && `${row.contacts.length} ${row.contacts.length === 1 ? 'contato' : 'contatos'}`}
      </Item>
      <Item rotulo="Próx. atividade">
        {proxima && (
          <span className={cn(proxima.tom === 'atrasada' && 'font-medium text-destructive')}>
            {proxima.rotulo} · {proxima.dica}
          </span>
        )}
      </Item>
    </Secao>
  );
}

type Rascunho = Record<'name' | 'cnpj' | 'website' | 'linkedin' | 'instagram' | 'segmento' | 'anel' | 'tier', string>;

const CAMPOS: ReadonlyArray<{ chave: keyof Rascunho; rotulo: string; largo?: boolean; placeholder?: string }> = [
  { chave: 'name', rotulo: 'Nome', largo: true },
  { chave: 'cnpj', rotulo: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { chave: 'website', rotulo: 'Site', placeholder: 'empresa.com.br' },
  { chave: 'linkedin', rotulo: 'LinkedIn', placeholder: 'linkedin.com/company/…' },
  { chave: 'instagram', rotulo: 'Instagram', placeholder: 'instagram.com/…' },
  { chave: 'segmento', rotulo: 'Segmento', largo: true, placeholder: 'Ex.: Mineração / Agro' },
  { chave: 'anel', rotulo: 'Anel', placeholder: '1, 2 ou 3' },
  { chave: 'tier', rotulo: 'Tier', placeholder: '1, 2 ou 3' },
];

function Edicao({ row, onFechar }: { row: CompanyRow; onFechar: () => void }) {
  const atualizar = useUpdateProspectCompany();
  const [rascunho, setRascunho] = useState<Rascunho>(() => rascunhoInicial(row));

  const salvar = async () => {
    const { company } = row;
    await atualizar.mutateAsync({
      id: company.id,
      input: {
        name: rascunho.name.trim() || company.name,
        cnpj: rascunho.cnpj || null,
        website: rascunho.website.trim() || null,
        linkedin_url: rascunho.linkedin.trim() || null,
        instagram_url: rascunho.instagram.trim() || null,
        segment: formatSegmentInput(rascunho.segmento),
        ring: formatRankInput(rascunho.anel),
        tier: formatRankInput(rascunho.tier),
        client_id: company.client_id,
        notes: company.notes,
      },
    });
    onFechar();
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        salvar().catch(() => undefined);
      }}
    >
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-x-4 gap-y-3.5 overflow-y-auto px-6 pb-6 pt-5">
        {CAMPOS.map((campo) => (
          <div key={campo.chave} className={cn('space-y-1.5', campo.largo && 'col-span-2')}>
            <Label htmlFor={`empresa-${campo.chave}`} className="text-[12.5px] font-medium text-muted-foreground">
              {campo.rotulo}
            </Label>
            <Input
              id={`empresa-${campo.chave}`}
              value={rascunho[campo.chave]}
              placeholder={campo.placeholder}
              onChange={(e) => setRascunho((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
              disabled={atualizar.isPending}
              className="h-[38px]"
            />
          </div>
        ))}
        <p className="col-span-2 text-xs text-muted-foreground">
          Os dados da empresa valem para todos os contatos dela.
        </p>
      </div>

      <Rodape>
        <Button type="button" variant="outline" onClick={onFechar} disabled={atualizar.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={atualizar.isPending}>
          {atualizar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar alterações
        </Button>
      </Rodape>
    </form>
  );
}

function rascunhoInicial(row: CompanyRow): Rascunho {
  const { company } = row;
  return {
    name: company.name,
    cnpj: company.cnpj ? formatCNPJ(company.cnpj) : '',
    website: company.website ?? '',
    linkedin: company.linkedin_url ?? '',
    instagram: company.instagram_url ?? '',
    segmento: segmentToInput({ setor: row.setor, subsetor: row.subsetor }),
    anel: row.anel ? String(row.anel) : '',
    tier: row.tier ? String(row.tier) : '',
  };
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="pb-1.5 pt-3.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
        {titulo}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

/** Uma linha rótulo/valor. Valor vazio vira "Não informado", nunca um traço mudo. */
function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const vazio = children === null || children === undefined || children === '' || children === false;
  return (
    <div className="grid min-h-10 grid-cols-[130px_minmax(0,1fr)] items-center gap-4 border-b border-border/60 text-[13.5px]">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="flex min-w-0 items-center gap-2">
        {vazio ? <span className="text-muted-foreground/80">Não informado</span> : children}
      </dd>
    </div>
  );
}

function LinkExterno({ href, icone: Icone }: { href?: string | null; icone: typeof Globe }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-[7px] rounded-sm text-success-emphasis hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{urlCurta(href)}</span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

function CnpjCopiavel({ cnpj }: { cnpj: string }) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const formatado = formatCNPJ(cnpj);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copiar = () => {
    navigator.clipboard?.writeText(formatado).catch(() => undefined);
    setCopiado(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiado(false), 1500);
  };

  const Icone = copiado ? Check : Copy;
  return (
    <>
      <span className="truncate">{formatado}</span>
      <Button type="button" variant="outline" size="sm" className="h-6 gap-1 px-2 text-xs font-normal" onClick={copiar}>
        <Icone className="h-3 w-3" aria-hidden="true" />
        <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar'}</span>
      </Button>
    </>
  );
}

function Rodape({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 border-t bg-muted/40 px-6 py-3.5">{children}</div>;
}

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}
