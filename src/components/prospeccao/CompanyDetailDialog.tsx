import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Globe, Instagram, Linkedin, Loader2, Pencil } from 'lucide-react';
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
import { comProtocolo, urlDoInstagram } from '@/lib/prospecting/links';
import { formatCNPJ } from '@/lib/masks';
import { cn } from '@/lib/utils';
import {
  FATURAMENTO_BASE_PADRAO,
  type FaturamentoBase,
  type ProspectCompanyDB,
  type ProspectContactDB,
  type ProspectWithCompany,
} from '@/types/prospect';
import { descreverFaturamento } from '@/lib/prospecting/faturamento';
import { FaturamentoAnualField } from './FaturamentoAnualField';
import { AbordagemBadge, SituacaoDot, TierBadge } from './CompanyBadges';
import { CompanyOpportunityList } from './CompanyOpportunityList';
import { Item, LinkExterno, Rodape, Secao } from './FichaDeCadastro';
import { CompanyReceitaCard } from './CompanyReceitaCard';
import { CnpjLookupField } from './CnpjLookupField';
import { useSaveCompanyReceita } from '@/hooks/useCompanyReceita';
import type { ReceitaSnapshot } from '@/types/receita';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyDetailDialogProps {
  row: CompanyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOpportunity: (prospect: ProspectWithCompany) => void;
}

/**
 * A empresa inteira num lugar só: cadastro, segmentação, situação, oportunidades e contatos.
 *
 * Os dados cadastrais (CNPJ, links) ficam SÓ aqui — a tabela mostra o que serve para
 * decidir de longe, o modal o que serve para agir. Editar aqui edita a empresa, e isso
 * vale para todas as oportunidades e contatos dela.
 */
export function CompanyDetailDialog({ row, open, onOpenChange, onOpenOpportunity }: CompanyDetailDialogProps) {
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
            onOpenOpportunity={onOpenOpportunity}
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
  onOpenOpportunity,
}: {
  row: CompanyRow;
  onEditar: () => void;
  onFechar: () => void;
  onOpenOpportunity: (prospect: ProspectWithCompany) => void;
}) {
  const { company } = row;
  const { can } = useAuth();
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
          <Item rotulo="Faturamento anual">{descreverFaturamento(company)}</Item>
        </Secao>

        <CompanyReceitaCard empresa={company} podeEditar={can('prospeccao:editar')} />

        <Secao titulo="Segmentação">
          <Item rotulo="Segmento">{row.setor && [row.setor, row.subsetor].filter(Boolean).join(' / ')}</Item>
          <Item rotulo="Anel">{row.anel && `Anel ${row.anel}`}</Item>
          <Item rotulo="Tier">{row.tier && `Tier ${row.tier}`}</Item>
        </Secao>

        <SecaoProspeccao row={row} />

        <Secao titulo={`Oportunidades · ${row.opportunities.length}`}>
          <div className="pt-1">
            <CompanyOpportunityList opportunities={row.opportunities} onOpenOpportunity={onOpenOpportunity} />
          </div>
        </Secao>

        <Secao titulo={`Contatos · ${row.contacts.length}`}>
          <div className="pt-1">
            <PessoasDaEmpresa pessoas={row.contacts} />
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

/** As pessoas cadastradas na empresa — quem pode entrar nas oportunidades dela. */
function PessoasDaEmpresa({ pessoas }: { pessoas: ProspectContactDB[] }) {
  if (pessoas.length === 0) {
    return <p className="py-3 text-[13.5px] text-muted-foreground">Nenhum contato cadastrado nesta empresa.</p>;
  }
  return (
    <ul className="divide-y overflow-hidden rounded-lg border">
      {pessoas.map((p) => (
        <li key={p.id} className="space-y-0.5 p-3">
          <p className="text-sm font-medium">{p.name}</p>
          {(p.role || p.email) && (
            <p className="truncate text-xs text-muted-foreground">{[p.role, p.email].filter(Boolean).join(' · ')}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function quantas(n: number, singular: string, plural: string): string | null {
  return n > 0 ? `${n} ${n === 1 ? singular : plural}` : null;
}

function SecaoProspeccao({ row }: { row: CompanyRow }) {
  const { byId } = useEmployeeDirectoryMap();
  const situacao = COMPANY_STATUS_META[row.status];
  const responsaveis = row.ownerIds.map((id) => byId.get(id)?.nome).filter(Boolean).join(', ');
  const proxima = row.nextTaskOn ? descreverProximaAtividade(row.nextTaskOn) : null;

  return (
    <Secao titulo="Pipeline">
      <Item rotulo="Situação">{`${situacao.label} — ${minusculaInicial(situacao.hint)}`}</Item>
      <Item rotulo="Responsável">{responsaveis}</Item>
      <Item rotulo="Oportunidades">{quantas(row.opportunities.length, 'oportunidade', 'oportunidades')}</Item>
      <Item rotulo="Próx. tarefa">
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

const CAMPO_CNPJ: keyof Rascunho = 'cnpj';

function Edicao({ row, onFechar }: { row: CompanyRow; onFechar: () => void }) {
  const atualizar = useUpdateProspectCompany();
  const gravarReceita = useSaveCompanyReceita();
  const [rascunho, setRascunho] = useState<Rascunho>(() => rascunhoInicial(row));
  const [faturamento, setFaturamento] = useState(() => faturamentoInicial(row.company));
  // Retrato achado pela busca de CNPJ: gravado junto ao salvar (empresa + sócios, ADR-0041).
  const [receita, setReceita] = useState<ReceitaSnapshot | null>(null);
  const pendente = atualizar.isPending || gravarReceita.isPending;

  const aplicarReceita = (achada: ReceitaSnapshot) => {
    setReceita(achada);
    setRascunho((atual) => ({
      ...atual,
      name: atual.name.trim() ? atual.name : achada.nomeFantasia ?? achada.razaoSocial,
      segmento: atual.segmento.trim() ? atual.segmento : achada.segmento ?? '',
    }));
  };

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
        faturamento_anual: faturamento.valor,
        faturamento_anual_base: faturamento.base,
      },
    });
    if (receita && receita.cnpj === rascunho.cnpj.replace(/\D/g, '')) {
      await gravarReceita.mutateAsync({ companyId: company.id, receita }).catch(() => undefined);
    }
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
            {campo.chave === CAMPO_CNPJ ? (
              <CnpjLookupField
                id={`empresa-${campo.chave}`}
                value={rascunho.cnpj}
                onChange={(valor) => setRascunho((atual) => ({ ...atual, cnpj: valor }))}
                onFound={aplicarReceita}
                disabled={pendente}
                className="h-[38px]"
              />
            ) : (
              <Input
                id={`empresa-${campo.chave}`}
                value={rascunho[campo.chave]}
                placeholder={campo.placeholder}
                onChange={(e) => setRascunho((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
                disabled={pendente}
                className="h-[38px]"
              />
            )}
          </div>
        ))}
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="empresa-faturamento" className="text-[12.5px] font-medium text-muted-foreground">
            Faturamento anual
          </Label>
          <FaturamentoAnualField
            id="empresa-faturamento"
            valor={faturamento.valor}
            base={faturamento.base}
            onValorChange={(valor) => setFaturamento((atual) => ({ ...atual, valor }))}
            onBaseChange={(base) => setFaturamento((atual) => ({ ...atual, base }))}
            disabled={pendente}
            className="h-[38px]"
          />
        </div>
        {receita && (
          <p className="col-span-2 text-xs text-muted-foreground" role="status">
            Dados da Receita encontrados ({receita.socios.length} sócios): gravados ao salvar.
          </p>
        )}
        <p className="col-span-2 text-xs text-muted-foreground">
          Os dados da empresa valem para todos os contatos dela.
        </p>
      </div>

      <Rodape>
        <Button type="button" variant="outline" onClick={onFechar} disabled={pendente}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Salvar alterações
        </Button>
      </Rodape>
    </form>
  );
}

function faturamentoInicial(company: ProspectCompanyDB): { valor: number; base: FaturamentoBase } {
  return {
    valor: company.faturamento_anual ?? 0,
    base: company.faturamento_anual_base ?? FATURAMENTO_BASE_PADRAO,
  };
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

function minusculaInicial(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}
