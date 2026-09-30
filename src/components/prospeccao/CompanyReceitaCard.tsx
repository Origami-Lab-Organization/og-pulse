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

interface CompanyReceitaCardProps {
  empresa: ProspectCompanyDB;
  podeEditar: boolean;
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
export function CompanyReceitaCard({ empresa, podeEditar }: CompanyReceitaCardProps) {
  const atualizar = useRefreshCompanyReceita();
  const consultada = !!empresa.receita_consultada_em;

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Dados da Receita">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Dados da Receita
        </h3>
        {podeEditar && empresa.cnpj && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => atualizar.mutate(empresa)}
            disabled={atualizar.isPending}
          >
            {atualizar.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
            )}
            {consultada ? 'Atualizar' : 'Consultar'}
          </Button>
        )}
      </header>

      {consultada ? <Retrato empresa={empresa} /> : <SemConsulta temCnpj={!!empresa.cnpj} />}

      <CompanySiteSection empresa={empresa} podeEditar={podeEditar} />
      <CompanyPartnersList empresa={empresa} podeEditar={podeEditar} />
    </section>
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

function Retrato({ empresa }: { empresa: ProspectCompanyDB }) {
  const sinal = leiDoBemSignal(empresa.regime_tributario);
  const ativa = isSituacaoAtiva(empresa.situacao_cadastral);
  const industria = industryLabel(industrySignal(empresa.receita));
  return (
    <div className="space-y-3">
      {!ativa && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="text-xs text-destructive">
            Situação na Receita: {empresa.situacao_cadastral}. Confirme antes de abordar.
          </p>
        </div>
      )}

      <CompanyFitSection empresa={empresa} />

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
