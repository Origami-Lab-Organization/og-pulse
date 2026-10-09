import { AlertTriangle, ChevronDown, Landmark, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useRefreshCompanyReceita } from '@/hooks/useCompanyReceita';
import { formatCurrency } from '@/lib/formatters';
import { formatCNPJ } from '@/lib/masks';
import { isSituacaoAtiva, LEI_DO_BEM_LABEL, leiDoBemSignal, porteLabel } from '@/lib/prospecting/receita';
import { industryLabel, industrySignal } from '@/lib/prospecting/industria';
import { cn } from '@/lib/utils';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { LeiDoBemSignal, ReceitaDetails } from '@/types/receita';
import { CompanyPartnersList } from './CompanyPartnersList';
import { CompanySiteSection } from './CompanySiteSection';
import { CompanyFitSection } from './CompanyFitSection';
import { CompanyFundingSection } from './CompanyFundingSection';

interface CompanyReceitaCardProps {
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
  /**
   * Ficha da oportunidade (09/10/2026): os sinais viram lista com ponto de cor, e saem daqui o
   * Fit (cartão próprio) e abertura/capital/razão social (já no cartão da Empresa).
   */
  compacto?: boolean;
}

const COR_LEI_DO_BEM: Record<LeiDoBemSignal, string> = {
  elegivel: 'bg-success-subtle text-success-emphasis',
  nao_elegivel: 'bg-muted text-muted-foreground',
  sem_regime: 'bg-warning-subtle text-warning-emphasis',
};

/**
 * O que a Receita diz da empresa (29/09/2026, ADR-0041), lido pelo que importa para a
 * Origami: regime tributário (Lei do Bem só no Lucro Real), porte, idade e situação — e a
 * rede de sócios, de onde sai com quem falar.
 */
export function CompanyReceitaCard(props: CompanyReceitaCardProps) {
  const { empresa, podeEditar, compacto = false } = props;
  const consultada = !!empresa.receita_consultada_em;
  const Retrato = compacto ? RetratoCompacto : RetratoCompleto;

  return (
    <section className={cn('rounded-lg border bg-card', compacto ? 'p-4' : 'p-3')} aria-label="Dados da Receita">
      <CabecalhoDaReceita empresa={empresa} podeEditar={podeEditar} compacto={compacto} />
      {consultada ? <Retrato empresa={empresa} /> : <SemConsulta temCnpj={!!empresa.cnpj} />}
      <CompanySiteSection empresa={empresa} podeEditar={podeEditar} />
      <CompanyFundingSection empresa={empresa} podeEditar={podeEditar} />
      <CompanyPartnersList empresa={empresa} podeEditar={podeEditar} />
    </section>
  );
}

function CabecalhoDaReceita(props: CompanyReceitaCardProps) {
  const { empresa, podeEditar, compacto } = props;
  return (
    <header className="mb-3 flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        {!compacto && <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        Dados da Receita
      </h3>
      {podeEditar && empresa.cnpj && <BotaoAtualizar empresa={empresa} />}
    </header>
  );
}

function BotaoAtualizar({ empresa }: { empresa: ProspectCompanyDB }) {
  const atualizar = useRefreshCompanyReceita();
  const Icone = atualizar.isPending ? Loader2 : RefreshCw;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={() => atualizar.mutate(empresa)}
      disabled={atualizar.isPending}
    >
      <Icone className={cn('mr-1 h-3 w-3', atualizar.isPending && 'animate-spin')} aria-hidden="true" />
      {empresa.receita_consultada_em ? 'Atualizar' : 'Consultar'}
    </Button>
  );
}

function SemConsulta({ temCnpj }: { temCnpj: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      {temCnpj
        ? 'Ainda sem dados da Receita. Consulte para ver regime tributário, porte e sócios.'
        : 'Cadastre o CNPJ da empresa para consultar regime tributário, porte e sócios.'}
    </p>
  );
}

function RetratoCompleto({ empresa }: { empresa: ProspectCompanyDB }) {
  const sinal = leiDoBemSignal(empresa.regime_tributario);
  const industria = industryLabel(industrySignal(empresa.receita));
  return (
    <div className="space-y-3">
      <AlertaDeSituacao empresa={empresa} />

      <CompanyFitSection empresa={empresa} fomento={empresa.fomento ?? null} />

      <div className="flex flex-wrap gap-1.5">
        {industria && (
          <Badge variant="secondary" className="bg-primary/10 font-normal text-primary">{industria}</Badge>
        )}
        <Badge variant="secondary" className={cn('font-normal', COR_LEI_DO_BEM[sinal])}>
          {LEI_DO_BEM_LABEL[sinal]}
          {empresa.regime_tributario_ano ? ` (${empresa.regime_tributario_ano})` : ''}
        </Badge>
        {porteLabel(empresa.porte) && (
          <Badge variant="secondary" className="font-normal">{porteLabel(empresa.porte)}</Badge>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Item termo="Abertura" valor={idadeDe(empresa.data_abertura)} />
        <Item
          termo="Capital social"
          valor={empresa.capital_social != null ? formatCurrency(empresa.capital_social) : null}
        />
        <Item termo="Razão social" valor={empresa.razao_social} largo />
      </dl>

      {empresa.receita && <Detalhes detalhes={empresa.receita} cnpj={empresa.cnpj} />}

      <p className="text-[11px] text-muted-foreground">
        Consultado em {dataBr(empresa.receita_consultada_em!.slice(0, 10))} · base pública da Receita
      </p>
    </div>
  );
}

/**
 * O que a Receita diz, em três linhas com ponto de cor (09/10/2026): o ramo, a Lei do Bem e o
 * porte. Cada linha tem o sinal em destaque e, embaixo, de onde ele vem.
 */
function RetratoCompacto({ empresa }: { empresa: ProspectCompanyDB }) {
  return (
    <div className="space-y-3">
      <AlertaDeSituacao empresa={empresa} />
      <ul className="space-y-2.5">
        {sinaisDa(empresa).map((sinal) => (
          <li key={sinal.titulo} className="flex items-start gap-2.5">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', sinal.cor)} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-snug">{sinal.titulo}</span>
              {sinal.detalhe && <span className="block text-xs text-muted-foreground">{sinal.detalhe}</span>}
            </span>
          </li>
        ))}
      </ul>
      {empresa.receita && <Detalhes detalhes={empresa.receita} cnpj={empresa.cnpj} />}
      <p className="text-[11px] text-muted-foreground">
        Consultado em {dataBr(empresa.receita_consultada_em!.slice(0, 10))} · base pública da Receita
      </p>
    </div>
  );
}

function AlertaDeSituacao({ empresa }: { empresa: ProspectCompanyDB }) {
  if (isSituacaoAtiva(empresa.situacao_cadastral)) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="text-xs text-destructive">
        Situação na Receita: {empresa.situacao_cadastral}. Confirme antes de abordar.
      </p>
    </div>
  );
}

const PONTO_DA_LEI_DO_BEM: Record<LeiDoBemSignal, string> = {
  elegivel: 'bg-success',
  nao_elegivel: 'bg-warning',
  sem_regime: 'bg-muted-foreground',
};

interface SinalDaReceita {
  titulo: string;
  detalhe: string | null;
  cor: string;
}

function sinaisDa(empresa: ProspectCompanyDB): SinalDaReceita[] {
  const lei = leiDoBemSignal(empresa.regime_tributario);
  const [tituloDaLei, detalheDaLei] = partirRotulo(LEI_DO_BEM_LABEL[lei]);
  const ano = empresa.regime_tributario_ano ? ` (${empresa.regime_tributario_ano})` : '';
  const sinais: Array<SinalDaReceita | null> = [
    sinalDaIndustria(empresa),
    { titulo: tituloDaLei, detalhe: detalheDaLei ? `${detalheDaLei}${ano}` : null, cor: PONTO_DA_LEI_DO_BEM[lei] },
    sinalDoPorte(empresa.porte),
  ];
  return sinais.filter((s): s is SinalDaReceita => !!s);
}

function sinalDaIndustria(empresa: ProspectCompanyDB): SinalDaReceita | null {
  const rotulo = industryLabel(industrySignal(empresa.receita));
  if (!rotulo) return null;
  const [titulo, detalhe] = partirRotulo(rotulo);
  return { titulo, detalhe: detalhe ?? 'CNAE principal', cor: 'bg-primary' };
}

function sinalDoPorte(porte?: string | null): SinalDaReceita | null {
  const rotulo = porteLabel(porte);
  if (!rotulo) return null;
  const [titulo, faixa] = partirRotulo(rotulo);
  return { titulo, detalhe: faixa ? `Porte declarado ${faixa.charAt(0).toLowerCase()}${faixa.slice(1)}` : null, cor: 'bg-muted-foreground' };
}

/**
 * Os rótulos da Receita juntam sinal e explicação ("Fora do Lucro Real — Lei do Bem não se
 * aplica", "Microempresa (até R$ 360 mil/ano)"); a lista mostra os dois em linhas separadas.
 */
function partirRotulo(rotulo: string): [string, string | null] {
  const [antes, ...depois] = rotulo.split(' — ');
  if (depois.length > 0) return [antes, maiusculaInicial(depois.join(' — '))];
  const parenteses = /^(.*?) \((.*)\)$/.exec(rotulo);
  return parenteses ? [parenteses[1], maiusculaInicial(parenteses[2])] : [rotulo, null];
}

function maiusculaInicial(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Detalhes({ detalhes, cnpj }: { detalhes: ReceitaDetails; cnpj: string | null }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Collapsible open={aberto} onOpenChange={setAberto}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-full justify-between px-2 text-xs">
          Mais dados da Receita
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="mt-2 grid grid-cols-1 gap-2">
          {linhasDeDetalhe(detalhes, cnpj).map(([termo, valor]) => (
            <Item key={termo} termo={termo} valor={valor} />
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

const juntarOuNulo = (partes: Array<string | null | undefined>, separador = ' · ') =>
  partes.filter(Boolean).join(separador) || null;

function enderecoDe(e: ReceitaDetails['endereco']): string | null {
  const cidade = e.municipio && e.uf ? `${e.municipio}/${e.uf}` : e.municipio;
  return juntarOuNulo([e.logradouro, e.numero, e.complemento, e.bairro, cidade], ', ');
}

function linhasDeDetalhe(d: ReceitaDetails, cnpj: string | null): Array<[string, string | null]> {
  return [
    ['CNPJ', cnpj ? juntarOuNulo([formatCNPJ(cnpj), d.matrizOuFilial]) : null],
    ['Natureza jurídica', d.naturezaJuridica],
    ['Regime por ano', juntarOuNulo(d.regimes.map((r) => `${r.ano}: ${r.forma}`)) ?? 'não informado'],
    ['Simples / MEI', simplesMei(d)],
    ['Atividade principal', d.cnaePrincipal?.descricao ?? null],
    ['Atividades secundárias', juntarOuNulo(d.cnaesSecundarios.map((c) => c.descricao))],
    ['Endereço', enderecoDe(d.endereco)],
    ['Telefones', juntarOuNulo(d.telefones)],
    ['E-mail de cadastro', d.email],
  ];
}

interface ItemProps {
  termo: string;
  valor: string | null;
  largo?: boolean;
}

function Item(props: ItemProps) {
  const { termo, valor, largo } = props;
  if (!valor) return null;
  return (
    <div className={cn('min-w-0', largo && 'col-span-2')}>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{termo}</dt>
      <dd className="break-words text-sm leading-snug">{valor}</dd>
    </div>
  );
}

function simplesMei(d: ReceitaDetails): string | null {
  if (d.simples == null && d.mei == null) return null;
  return [d.simples ? 'optante pelo Simples' : 'fora do Simples', d.mei ? 'MEI' : null].filter(Boolean).join(' · ');
}

function idadeDe(abertura?: string | null): string | null {
  if (!abertura) return null;
  const anos = Math.floor((Date.now() - new Date(`${abertura}T00:00:00`).getTime()) / (365.25 * 86400000));
  const idade = anos < 1 ? 'menos de 1 ano' : `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  return `${dataBr(abertura)} (${idade})`;
}

function dataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
