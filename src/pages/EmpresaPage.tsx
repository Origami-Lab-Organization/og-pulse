import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useHideValues } from '@/contexts/HideValuesContext';
import { FASE_DA_EMPRESA, SECAO_DA_EMPRESA, SECAO_DO_CAMPO, type CampoDaEmpresa, type SecaoDaEmpresa } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { EdicaoDaEmpresa } from '@/types/paginaDaEmpresa';
import type { FichaReceita } from '@/types/fichaReceita';
import { CabecalhoDaEmpresa } from '@/components/prospeccao/empresa/CabecalhoDaEmpresa';
import { EdicaoDaEmpresaContext } from '@/components/prospeccao/empresa/edicaoDaEmpresa';
import { AbasDaEmpresa } from '@/components/prospeccao/empresa/AbasDaEmpresa';
import { SecaoCanais } from '@/components/prospeccao/empresa/SecaoCanais';
import { SecaoEstudo } from '@/components/prospeccao/empresa/SecaoEstudo';
import { SecaoInsights } from '@/components/prospeccao/empresa/SecaoInsights';
import { SecaoHistorico } from '@/components/prospeccao/empresa/SecaoHistorico';
import { SecaoPessoas } from '@/components/prospeccao/empresa/SecaoPessoas';
import { SecaoQualificacao } from '@/components/prospeccao/empresa/SecaoQualificacao';
import { SecaoRiscos } from '@/components/prospeccao/empresa/SecaoRiscos';
import { TrilhaDaEmpresa } from '@/components/prospeccao/empresa/TrilhaDaEmpresa';
import { VisaoDaEmpresa } from '@/components/prospeccao/empresa/VisaoDaEmpresa';
import { WidgetDaQualificacao } from '@/components/prospeccao/empresa/WidgetDaQualificacao';
import { useEmpresaDaPagina, type EmpresaDaPagina } from '@/components/prospeccao/empresa/useEmpresaDaPagina';

function Carregando() {
  return (
    <div className="space-y-3.5" aria-busy="true">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function NaoCarregou({ onTentar }: { onTentar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-[15px] font-medium">A empresa não carregou agora.</p>
      <Button variant="outline" size="sm" onClick={onTentar}>Tentar de novo</Button>
    </div>
  );
}

/** Editar um campo abre antes a aba em que ele mora. */
function useEdicao(): EdicaoDaEmpresa {
  const [editando, setEditando] = useState<CampoDaEmpresa | null>(null);
  const [widgetAberto, abrirWidget] = useState(false);
  const [aba, mostrar] = useState<SecaoDaEmpresa>(SECAO_DA_EMPRESA.QUALIFICACAO);
  const editar = useCallback((campo: CampoDaEmpresa | null) => {
    const secao = campo ? SECAO_DO_CAMPO[campo] : undefined;
    if (secao) mostrar(secao);
    setEditando(campo);
  }, []);
  return useMemo(() => ({ editando, editar, widgetAberto, abrirWidget, aba, mostrar }), [editando, editar, widgetAberto, aba]);
}

/** Widget só na qualificação, para quem pode editar e com a empresa no Pulse. */
function Widget({ pagina }: { pagina: EmpresaDaPagina }) {
  const { can } = useAuth();
  const { fase, ativa, empresaDoPulse } = pagina;
  if (fase !== FASE_DA_EMPRESA.QUALIFICACAO || !ativa || !empresaDoPulse || !can('prospeccao:editar')) return null;
  return <WidgetDaQualificacao empresa={empresaDoPulse} oportunidade={ativa} />;
}

/** Cabeçalho, cartões e abas ficam parados; só o conteúdo da aba rola (no celular, a página toda). */
function PaginaCarregada({ pagina, ficha }: { pagina: EmpresaDaPagina; ficha: FichaReceita }) {
  const { empresaDoPulse } = pagina;
  const secoes = {
    [SECAO_DA_EMPRESA.QUALIFICACAO]: <SecaoQualificacao empresa={ficha.empresa} />,
    [SECAO_DA_EMPRESA.PESSOAS]: <SecaoPessoas pagina={pagina} />,
    [SECAO_DA_EMPRESA.CANAIS]: <SecaoCanais empresa={empresaDoPulse} contato={ficha.contato} />,
    [SECAO_DA_EMPRESA.RISCOS]: <SecaoRiscos ficha={ficha} />,
    [SECAO_DA_EMPRESA.HISTORICO]: <SecaoHistorico ficha={ficha} />,
    [SECAO_DA_EMPRESA.INSIGHTS]: empresaDoPulse ? <SecaoInsights companyId={empresaDoPulse.id} /> : null,
    [SECAO_DA_EMPRESA.ESTUDO]: empresaDoPulse ? <SecaoEstudo empresa={empresaDoPulse} /> : null,
  };
  return (
    <div className="-mx-1 -mt-2 flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-1 pt-1 md:overflow-hidden">
      <CabecalhoDaEmpresa pagina={pagina} empresa={ficha.empresa} />
      <VisaoDaEmpresa pagina={pagina} empresa={ficha.empresa} />
      <AbasDaEmpresa secoes={secoes} />
      <Widget pagina={pagina} />
    </div>
  );
}

/**
 * Página da empresa (US-0053): substitui a gaveta da Base, a ficha aberta pela Qualificação, o
 * modal da empresa no Pipeline e a página do cliente. Cabeçalho e visão geral fixos, as seções em
 * abas (26/11/2026) e o widget da qualificação.
 */
export default function EmpresaPage() {
  const { cnpj = '' } = useParams<{ cnpj: string }>();
  const pagina = useEmpresaDaPagina(cnpj);
  const edicao = useEdicao();
  const { ficha } = pagina;
  useHideValues();
  const nome = ficha.data?.empresa.nome_fantasia || ficha.data?.empresa.razao_social || 'Empresa';
  return (
    <AppLayout title={nome} trail={<TrilhaDaEmpresa />} fillViewport>
      <EdicaoDaEmpresaContext.Provider value={edicao}>
        {ficha.isLoading && <Carregando />}
        {!ficha.isLoading && (ficha.error || !ficha.data) && <NaoCarregou onTentar={() => ficha.refetch()} />}
        {ficha.data && <PaginaCarregada pagina={pagina} ficha={ficha.data} />}
      </EdicaoDaEmpresaContext.Provider>
    </AppLayout>
  );
}
