import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useHideValues } from '@/contexts/HideValuesContext';
import { useBantDoQuadro } from '@/hooks/useBant';
import { useEmployeeDirectoryMap } from '@/hooks/useEmployeeDirectory';
import { useEmQualificacao } from '@/hooks/useEmQualificacao';
import { faturamentoCompacto } from '@/lib/prospecting/faturamento';
import { companyFit, FRENTES_DO_FIT, ROTULO_CURTO_DA_FRENTE, ROTULO_DA_FRENTE, servicoEmDestaque } from '@/lib/prospecting/fit';
import type { CompanyFit } from '@/types/receita';
import { formatarData } from '@/lib/prospecting/prazos';
import { formatCNPJ } from '@/lib/masks';
import { emTitulo } from '@/lib/prospecting/empresasReceita';
import { getTipoDeContaLabel, opportunityName, type ProspectWithCompany } from '@/types/prospect';
import type { BantDaOportunidade } from '@/types/bant';
import { DiscardProspectDialog } from '../DiscardProspectDialog';
import { FichaDaEmpresaNoPipeline } from '../FichaDaEmpresaNoPipeline';
import { EstadoVazio } from '../ListaDeCadastro';
import { ProspectDetailDialog } from '../ProspectDetailDialog';
import { ProspectWonDialog } from '../ProspectWonDialog';
import { LetrasDoBant } from '../bant/LetrasDoBant';

/**
 * Aba "Em qualificação" da tela Empresas (US-0023, revista em 19/11/2026): as empresas escolhidas
 * na base, em estudo antes de virar abordagem. Tabela para comparar (BANT, tipo de conta, fit,
 * faturamento, responsável); a linha abre a ficha da oportunidade no "Estudo da conta". Daqui a
 * empresa vai para A abordar no Pipeline, para a Perda ou de volta para a lista.
 */
export function EmQualificacao() {
  const { lista, isLoading, data: todas = [] } = useEmQualificacao();
  const bantPorOportunidade = useBantDoQuadro(lista);
  const [aberta, setAberta] = useState<ProspectWithCompany | null>(null);
  const [descartando, setDescartando] = useState<ProspectWithCompany | null>(null);
  const [motivoSugerido, setMotivoSugerido] = useState<string | null>(null);
  const [ganhando, setGanhando] = useState<ProspectWithCompany | null>(null);
  const [empresaAberta, setEmpresaAberta] = useState<string | null>(null);
  useAbrirPeloLink(todas, isLoading, setAberta);

  // A ficha acompanha a versão atual (depois de mover, ela some da lista mas segue aberta).
  const abertaAtual = aberta ? todas.find((p) => p.id === aberta.id) ?? aberta : null;
  const ordenadas = useMemo(
    () => [...lista].sort((a, b) => (bantPorOportunidade.get(b.id)?.nota ?? 0) - (bantPorOportunidade.get(a.id)?.nota ?? 0)),
    [lista, bantPorOportunidade],
  );

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Conteudo carregando={isLoading} lista={ordenadas} bantPorOportunidade={bantPorOportunidade} onAbrir={setAberta} />
      </div>

      <ProspectDetailDialog
        prospect={abertaAtual}
        open={!!aberta}
        onOpenChange={(abertaAgora) => !abertaAgora && setAberta(null)}
        onDiscard={(p, motivo) => {
          setMotivoSugerido(motivo ?? null);
          setDescartando(p);
        }}
        onWin={setGanhando}
        onOpenCompany={setEmpresaAberta}
      />
      <FichaDaEmpresaNoPipeline empresaId={empresaAberta} onEmpresaId={setEmpresaAberta} onAbrirOportunidade={setAberta} />
      <DiscardProspectDialog
        prospect={descartando}
        open={!!descartando}
        onOpenChange={(abertaAgora) => !abertaAgora && setDescartando(null)}
        motivoSugerido={motivoSugerido}
      />
      <ProspectWonDialog prospect={ganhando} open={!!ganhando} onOpenChange={(abertaAgora) => !abertaAgora && setGanhando(null)} />
    </>
  );
}

/** `?oportunidade=<id>`: o link da mensagem de "Mover para qualificação" abre a ficha. */
function useAbrirPeloLink(todas: ProspectWithCompany[], carregando: boolean, abrir: (p: ProspectWithCompany) => void) {
  const [params, setParams] = useSearchParams();
  const id = params.get('oportunidade');
  useEffect(() => {
    if (!id || carregando) return;
    const alvo = todas.find((p) => p.id === id);
    if (alvo) abrir(alvo);
    setParams((atual) => {
      atual.delete('oportunidade');
      return atual;
    }, { replace: true });
  }, [id, carregando, todas, abrir, setParams]);
}

interface ConteudoProps {
  carregando: boolean;
  lista: ProspectWithCompany[];
  bantPorOportunidade: Map<string, BantDaOportunidade>;
  onAbrir: (p: ProspectWithCompany) => void;
}

function Conteudo(props: ConteudoProps) {
  const { carregando, lista, bantPorOportunidade, onAbrir } = props;
  if (carregando) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando empresas em qualificação">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (!lista.length) {
    return (
      <EstadoVazio
        titulo="Nenhuma empresa em qualificação"
        texto='Na aba "Base de empresas", marque as empresas e use "Mover para qualificação".'
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] border-collapse text-[13.5px]">
        <caption className="sr-only">Empresas em qualificação</caption>
        <thead>
          <tr className="h-10 border-b bg-muted/40 text-left text-[12.5px] text-muted-foreground">
            <th scope="col" className="px-3 pl-5 font-medium">Empresa</th>
            <th scope="col" className="px-3 font-medium">BANT</th>
            <th scope="col" className="px-3 font-medium">Tipo de conta</th>
            {/* US-0014: o fit de cada serviço, lado a lado; a maior nota vai em destaque. */}
            {FRENTES_DO_FIT.map((f) => (
              <th key={f} scope="col" className="px-2 text-center font-medium" title={`Fit em ${ROTULO_DA_FRENTE[f]}`}>{ROTULO_CURTO_DA_FRENTE[f]}</th>
            ))}
            <th scope="col" className="px-3 text-center font-medium">Faturamento</th>
            <th scope="col" className="px-3 font-medium">Responsável</th>
            <th scope="col" className="px-3 pr-5 font-medium">Desde</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => <Linha key={p.id} prospect={p} bant={bantPorOportunidade.get(p.id)} onAbrir={onAbrir} />)}
        </tbody>
      </table>
    </div>
  );
}

const TECLA_QUE_ABRE = 'Enter';

const TRACO = '—';

/** O que cada coluna mostra, já em texto: a linha só desenha. */
function colunasDaLinha(p: ProspectWithCompany, nomeDe: (id: string) => string | undefined) {
  const empresa = p.company;
  const fits = empresa ? companyFit(empresa, empresa.fomento ?? null) : null;
  return {
    fits,
    maior: servicoEmDestaque(fits)?.frente ?? null,
    local: [emTitulo(empresa?.receita?.endereco?.municipio), empresa?.receita?.endereco?.uf].filter(Boolean).join(' · '),
    cnpj: empresa?.cnpj ? formatCNPJ(empresa.cnpj) : null,
    tipo: getTipoDeContaLabel(empresa?.tipo_conta) ?? TRACO,
    faturamento: empresa?.faturamento_anual != null ? faturamentoCompacto(empresa.faturamento_anual) : TRACO,
    responsavel: p.owner_id ? nomeDe(p.owner_id) ?? TRACO : 'Sem responsável',
    desde: formatarData(p.created_at.slice(0, 10)),
  };
}

interface LinhaProps {
  prospect: ProspectWithCompany;
  bant: BantDaOportunidade | undefined;
  onAbrir: (p: ProspectWithCompany) => void;
}

function Linha(props: LinhaProps) {
  const { prospect: p, bant, onAbrir } = props;
  useHideValues();
  const { byId } = useEmployeeDirectoryMap();
  const c = colunasDaLinha(p, (id) => byId.get(id)?.nome);
  return (
    <tr
      tabIndex={0}
      onClick={() => onAbrir(p)}
      onKeyDown={(e) => e.key === TECLA_QUE_ABRE && e.target === e.currentTarget && onAbrir(p)}
      title="Abrir o estudo da conta"
      className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <td className="px-3 py-2.5 pl-5">
        <p className="max-w-[280px] truncate font-semibold" title={opportunityName(p)}>{opportunityName(p)}</p>
        <p className="whitespace-nowrap text-xs text-muted-foreground">
          {c.cnpj && <span className="font-mono tabular-nums">{c.cnpj}</span>}
          {c.local && <span> · {c.local}</span>}
        </p>
      </td>
      <td className="px-3 py-2.5">{bant ? <LetrasDoBant bant={bant} compacto /> : TRACO}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{c.tipo}</td>
      {FRENTES_DO_FIT.map((f) => <CelulaDeFit key={f} fit={c.fits?.find((x) => x.frente === f)} maior={c.maior === f} />)}
      <td className="whitespace-nowrap px-3 py-2.5 text-center font-mono tabular-nums">{c.faturamento}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{c.responsavel}</td>
      <td className="whitespace-nowrap px-3 py-2.5 pr-5 text-muted-foreground">{c.desde}</td>
    </tr>
  );
}

interface CelulaDeFitProps {
  fit: CompanyFit | undefined;
  maior: boolean;
}

/** A nota de um serviço; a maior em destaque (US-0014). Sem dados da Receita, traço. */
function CelulaDeFit(props: CelulaDeFitProps) {
  const { fit, maior } = props;
  if (!fit) return <td className="px-2 py-2.5 text-center text-muted-foreground">{TRACO}</td>;
  return (
    <td
      className={cn('px-2 py-2.5 text-center font-mono tabular-nums', maior ? 'font-semibold text-foreground' : 'text-muted-foreground')}
      title={`${fit.rotulo}: ${fit.nota}${maior ? ' — a maior nota' : ''}`}
    >
      {fit.nota}
    </td>
  );
}
