import { Globe, Instagram, Linkedin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useProspectCompanyByCnpj } from '@/hooks/useProspectCompanies';
import { formatCurrency } from '@/lib/formatters';
import { formatCNPJ } from '@/lib/masks';
import { faturamentoCompacto } from '@/lib/prospecting/faturamento';
import { comProtocolo, urlCurta, urlDoInstagram } from '@/lib/prospecting/links';
import { anosDesde, formatarData } from '@/lib/prospecting/prazos';
import {
  getFaturamentoBaseLabel,
  type FaturamentoBase,
  type ProspectCompanyDB,
} from '@/types/prospect';
import type { ReceitaSnapshot } from '@/types/receita';
import { CnpjLookupField } from './CnpjLookupField';
import { FaturamentoAnualField } from './FaturamentoAnualField';
import { BotaoEditar, Campo, CartaoDaFicha, LinhaDeDado } from './FichaDaOportunidade';

interface OpportunityCompanyCardProps {
  empresa?: ProspectCompanyDB | null;
  editando: boolean;
  rascunho: Record<string, string>;
  definir: (campo: string) => (valor: string) => void;
  podeEditar: boolean;
  onEditar: () => void;
  onReceita: (receita: ReceitaSnapshot) => void;
  receitaAchada: ReceitaSnapshot | null;
}

/**
 * A empresa da oportunidade, na coluna da direita. Os campos valem para todas as
 * oportunidades e contatos dela: editar aqui edita a empresa (o cadastro reutilizável).
 *
 * Desde 09/10/2026 a leitura junta, numa lista de rótulo e valor, o que antes ficava espalhado
 * entre este cartão e o da Receita: CNPJ, faturamento, abertura e capital social.
 */
export function OpportunityCompanyCard(props: OpportunityCompanyCardProps) {
  const { empresa, editando, podeEditar, onEditar } = props;
  return (
    <CartaoDaFicha titulo="Empresa" acao={podeEditar && !editando && <BotaoEditar onClick={onEditar} />}>
      {editando ? <EdicaoDaEmpresa {...props} /> : <LeituraDaEmpresa empresa={empresa} podeEditar={podeEditar} onEditar={onEditar} />}
    </CartaoDaFicha>
  );
}

interface LeituraProps {
  empresa?: ProspectCompanyDB | null;
  podeEditar: boolean;
  onEditar: () => void;
}

function LeituraDaEmpresa(props: LeituraProps) {
  const { empresa, podeEditar, onEditar } = props;
  if (!empresa) return <p className="text-sm text-muted-foreground">Empresa não informada.</p>;

  // Campo vazio não vira traço mudo: vira o convite para preencher, que abre a mesma edição.
  const convite = podeEditar ? <Convite onClick={onEditar} /> : null;
  return (
    <div className="space-y-3">
      <NomeDaEmpresa empresa={empresa} />
      <Segmentacao empresa={empresa} />
      <LinksDaEmpresa empresa={empresa} />
      <Separator />
      <dl className="space-y-2">
        <LinhaDeDado termo="CNPJ">{empresa.cnpj ? formatCNPJ(empresa.cnpj) : convite}</LinhaDeDado>
        <LinhaDeDado termo="Faturamento">{faturamentoDe(empresa) ?? convite}</LinhaDeDado>
        <LinhaDeDado termo="Abertura">{aberturaDe(empresa.data_abertura)}</LinhaDeDado>
        <LinhaDeDado termo="Capital social">
          {empresa.capital_social != null ? formatCurrency(empresa.capital_social) : null}
        </LinhaDeDado>
      </dl>
    </div>
  );
}

/** O nome de uso e, quando é outro, a razão social embaixo. */
function NomeDaEmpresa({ empresa }: { empresa: ProspectCompanyDB }) {
  const razao = empresa.razao_social !== empresa.name ? empresa.razao_social : null;
  return (
    <div>
      <p className="text-base font-semibold leading-snug">{empresa.name}</p>
      {razao && <p className="text-xs text-muted-foreground">{razao}</p>}
    </div>
  );
}

function Convite({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      Adicionar
    </button>
  );
}

function Segmentacao({ empresa }: { empresa: ProspectCompanyDB }) {
  const chips = [empresa.segment, empresa.ring && `Anel ${empresa.ring}`, empresa.tier && `Tier ${empresa.tier}`]
    .filter(Boolean) as string[];
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <Badge key={chip} variant="secondary" className="rounded-full font-normal">{chip}</Badge>
      ))}
    </div>
  );
}

/** O site por extenso, que é o que se procura; LinkedIn e Instagram só pelo ícone. */
function LinksDaEmpresa({ empresa }: { empresa: ProspectCompanyDB }) {
  const instagram = urlDoInstagram(empresa.instagram_url);
  if (!empresa.website && !empresa.linkedin_url && !instagram) return null;
  return (
    <div className="flex gap-1.5">
      {empresa.website && (
        <Button variant="outline" size="sm" className="h-8 min-w-0 flex-1 justify-start px-3 text-xs font-normal" asChild>
          <a href={comProtocolo(empresa.website)} target="_blank" rel="noopener noreferrer">
            <Globe className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{urlCurta(empresa.website)}</span>
          </a>
        </Button>
      )}
      <LinkDeIcone href={empresa.linkedin_url ? comProtocolo(empresa.linkedin_url) : null} icone={Linkedin} rotulo="LinkedIn da empresa" />
      <LinkDeIcone href={instagram} icone={Instagram} rotulo="Instagram da empresa" />
    </div>
  );
}

interface LinkDeIconeProps {
  href: string | null;
  icone: typeof Globe;
  rotulo: string;
}

function LinkDeIcone(props: LinkDeIconeProps) {
  const { href, icone: Icone, rotulo } = props;
  if (!href) return null;
  return (
    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={rotulo} title={rotulo}>
        <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </Button>
  );
}

/** "R$ 7,4 mi apurado" — a base vai junto sempre: palpite não pode passar por dado. */
function faturamentoDe(empresa: ProspectCompanyDB) {
  if (empresa.faturamento_anual == null) return null;
  const base = getFaturamentoBaseLabel(empresa.faturamento_anual_base)?.toLowerCase();
  return (
    <>
      {faturamentoCompacto(empresa.faturamento_anual)}
      {base && <span className="font-normal text-muted-foreground"> {base}</span>}
    </>
  );
}

function aberturaDe(abertura?: string | null) {
  if (!abertura) return null;
  const anos = anosDesde(abertura);
  const idade = anos < 1 ? 'menos de 1 ano' : `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return (
    <>
      {formatarData(abertura)}
      <span className="font-normal text-muted-foreground"> · {idade}</span>
    </>
  );
}

function EdicaoDaEmpresa(props: OpportunityCompanyCardProps) {
  const { empresa, rascunho, definir, onReceita, receitaAchada } = props;
  return (
    <div className="space-y-3">
      <Campo label="Nome" draft={rascunho.company_name} onChange={definir('company_name')} />
      <div className="space-y-1">
        <Label htmlFor="ficha-empresa-cnpj" className="text-xs text-muted-foreground">CNPJ</Label>
        <CnpjLookupField
          id="ficha-empresa-cnpj"
          value={rascunho.company_cnpj ?? ''}
          onChange={definir('company_cnpj')}
          onFound={onReceita}
        />
        {receitaAchada && (
          <p className="text-xs text-muted-foreground" role="status">
            Dados da Receita encontrados ({receitaAchada.socios.length} sócios): gravados ao salvar.
          </p>
        )}
        <AvisoDeCnpjCadastrado cnpj={rascunho.company_cnpj ?? ''} empresaId={empresa?.id} />
      </div>
      <Campo label="LinkedIn" draft={rascunho.company_linkedin} onChange={definir('company_linkedin')} />
      <Campo label="Instagram" draft={rascunho.company_instagram} onChange={definir('company_instagram')} />
      <Campo label="Site" draft={rascunho.company_website} onChange={definir('company_website')} />
      <Campo label="Segmento" draft={rascunho.company_segment} onChange={definir('company_segment')} />
      <Campo label="Anel" draft={rascunho.company_ring} onChange={definir('company_ring')} />
      <Campo label="Tier" draft={rascunho.company_tier} onChange={definir('company_tier')} />
      <div className="space-y-1">
        <Label htmlFor="ficha-empresa-faturamento" className="text-xs text-muted-foreground">Faturamento anual</Label>
        <FaturamentoAnualField
          id="ficha-empresa-faturamento"
          valor={Number(rascunho.company_faturamento) || 0}
          base={rascunho.company_faturamento_base as FaturamentoBase}
          onValorChange={(valor) => definir('company_faturamento')(String(valor))}
          onBaseChange={definir('company_faturamento_base')}
        />
      </div>
      <p className="text-xs text-muted-foreground">Os campos da empresa valem para todas as oportunidades e contatos dela.</p>
    </div>
  );
}

/** Avisa antes de salvar que o CNPJ é de outra empresa — e que a oportunidade vai passar para ela. */
function AvisoDeCnpjCadastrado({ cnpj, empresaId }: { cnpj: string; empresaId?: string }) {
  const { data: cadastrada } = useProspectCompanyByCnpj(cnpj);
  if (!cadastrada || cadastrada.id === empresaId) return null;
  return (
    <p className="text-xs text-muted-foreground" role="status">
      Este CNPJ já é de <span className="font-medium text-foreground">{cadastrada.name}</span>. Ao salvar, a
      oportunidade passa para essa empresa.
    </p>
  );
}
