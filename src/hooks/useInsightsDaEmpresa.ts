import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useInformarFaturamento, useInformarFuncionarios } from '@/hooks/usePaginaDaEmpresa';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { ORIGEM_DO_TIME } from '@/lib/prospecting/funcionarios.constants';
import {
  CHAVE_DAS_PROPOSTAS, CHAVE_DO_PEDIDO, CHAVE_DO_RUNNER, CHAVE_DOS_INSIGHTS, ESTADO_DA_PROPOSTA,
  INTERVALO_DO_PEDIDO_MS, INTERVALO_DO_RUNNER_MS, PEDIDO_ABERTO, STATUS_DO_PEDIDO, TEMA_TODOS, TEMAS_DOS_INSIGHTS, TIPO_DE_PROPOSTA,
  type TemaDoPedido,
} from '@/lib/prospecting/insights.constants';
import {
  decidirProposta, pedidosRecentes, pedirInsights, propostasDePorte, runnerDisponivel, versoesDosInsights,
} from '@/services/insightsService';
import type { InsightsPorTema, PedidoDeInsights, PedidoNovo, PropostaDePorte, VersaoDosInsights } from '@/types/insights';

/** Insights de IA da empresa (US-0057): um bloco por tema, o porte e os pedidos de cada um. */

/** Só para quem gera: o runner dessa pessoa está dando sinal. */
export function useRunnerDisponivel(ativo: boolean) {
  return useQuery({
    queryKey: [CHAVE_DO_RUNNER],
    queryFn: runnerDisponivel,
    enabled: ativo,
    refetchInterval: INTERVALO_DO_RUNNER_MS,
  });
}

const algumAberto = (pedidos: PedidoDeInsights[] | undefined) => !!pedidos?.some((p) => PEDIDO_ABERTO.has(p.status));

/** Quando um pedido acompanhado termina pronto, recarrega versões e propostas. */
function useAoTerminar(companyId: string, pedidos: PedidoDeInsights[]) {
  const qc = useQueryClient();
  const abertos = useRef(new Set<string>());
  useEffect(() => {
    const terminou = pedidos.some((p) => abertos.current.has(p.id) && p.status === STATUS_DO_PEDIDO.PRONTO);
    abertos.current = new Set(pedidos.filter((p) => PEDIDO_ABERTO.has(p.status)).map((p) => p.id));
    if (!terminou) return;
    qc.invalidateQueries({ queryKey: [CHAVE_DOS_INSIGHTS, companyId] });
    qc.invalidateQueries({ queryKey: [CHAVE_DAS_PROPOSTAS, companyId] });
  }, [companyId, pedidos, qc]);
}

/** A versão de "todos" (pedidos de antes do pedido por tema) vale para cada bloco. */
const doTema = (tema: TemaDoPedido) => (x: { tema: TemaDoPedido }) => x.tema === tema || x.tema === TEMA_TODOS;

function porTema(pedidos: PedidoDeInsights[], versoes: VersaoDosInsights[], propostas: PropostaDePorte[]): InsightsPorTema {
  return {
    pedidoDo: (tema) => pedidos.find((p) => p.tema === tema) ?? null,
    versoesDo: (tema) => versoes.filter(doTema(tema)),
    propostas,
  };
}

export function useInsightsDaEmpresa(companyId: string): InsightsPorTema {
  const pedidos = useQuery({
    queryKey: [CHAVE_DO_PEDIDO, companyId],
    queryFn: () => pedidosRecentes(companyId),
    refetchInterval: (q) => (algumAberto(q.state.data) ? INTERVALO_DO_PEDIDO_MS : false),
  });
  const versoes = useQuery({ queryKey: [CHAVE_DOS_INSIGHTS, companyId], queryFn: () => versoesDosInsights(companyId) });
  const propostas = useQuery({ queryKey: [CHAVE_DAS_PROPOSTAS, companyId], queryFn: () => propostasDePorte(companyId) });
  const lista = useMemo(() => pedidos.data ?? [], [pedidos.data]);
  useAoTerminar(companyId, lista);
  return useMemo(() => porTema(lista, versoes.data ?? [], propostas.data ?? []), [lista, versoes.data, propostas.data]);
}

export function usePedirInsights(companyId: string) {
  const { employee } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pedido: PedidoNovo) => pedirInsights(companyId, employee!.tenant_id, pedido),
    onSuccess: () => qc.invalidateQueries({ queryKey: [CHAVE_DO_PEDIDO, companyId] }),
    onError: (erro) => {
      qc.invalidateQueries({ queryKey: [CHAVE_DO_RUNNER] });
      toast({ title: 'Não deu para pedir os insights', description: mensagemParaUsuario(erro), variant: 'destructive' });
    },
  });
}

/**
 * Aceitar grava a faixa na empresa pelo caminho do modal da US-0056 (estimada, com a confiança e a
 * fonte da proposta) e só então marca a proposta; recusar só marca. A IA nunca grava na empresa.
 */
export function useDecidirProposta(companyId: string) {
  const qc = useQueryClient();
  const funcionarios = useInformarFuncionarios();
  const faturamento = useInformarFaturamento();
  const gravarNaEmpresa = (p: PropostaDePorte) => {
    const informado = { de: p.de, ate: p.ate, origem: ORIGEM_DO_TIME.ESTIMADO, confianca: p.confianca, fonte: p.fonte };
    const campo = p.tipo === TIPO_DE_PROPOSTA.FUNCIONARIOS ? funcionarios : faturamento;
    return campo.mutateAsync({ id: companyId, informado });
  };
  return useMutation({
    mutationFn: async ({ proposta, aceitar }: { proposta: PropostaDePorte; aceitar: boolean }) => {
      if (aceitar) await gravarNaEmpresa(proposta);
      await decidirProposta(proposta.id, aceitar ? ESTADO_DA_PROPOSTA.ACEITA : ESTADO_DA_PROPOSTA.RECUSADA);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [CHAVE_DAS_PROPOSTAS, companyId] }),
    onError: (erro) => toast({ title: 'Não deu para decidir a proposta', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}

/** A versão mostrada num bloco: a escolhida no seletor ou, sem escolha, a mais recente. */
export function useVersaoEscolhida(versoes: VersaoDosInsights[]) {
  const [escolhida, escolher] = useState<string | null>(null);
  return { versao: versoes.find((v) => v.id === escolhida) ?? versoes[0], escolher };
}

/**
 * O "Gerar com IA" de um tema: quem pode, o último pedido do tema, se ele ainda está andando e se o
 * runner de quem pede está fora do ar (aí não dá para pedir).
 */
export function useAcaoDoTema(companyId: string, tema: TemaDoPedido) {
  const { can } = useAuth();
  const podeGerar = can('prospeccao:gerar-insights');
  const runner = useRunnerDisponivel(podeGerar);
  const pedir = usePedirInsights(companyId);
  const pedido = useInsightsDaEmpresa(companyId).pedidoDo(tema);
  const aberto = !!pedido && PEDIDO_ABERTO.has(pedido.status);
  const fora = !runner.isLoading && !runner.data;
  return {
    podeGerar,
    pedido,
    aberto,
    esperando: aberto || fora,
    ocupado: runner.isLoading || pedir.isPending,
    pedir: (orientacao?: string, aoPedir?: () => void) => pedir.mutate({ tema, orientacao }, { onSuccess: aoPedir }),
  };
}

/** O passo "Estudo da conta gerado" do widget: os quatro blocos têm uma versão. */
export function useEstudoGerado(companyId: string): boolean {
  const { versoesDo } = useInsightsDaEmpresa(companyId);
  return TEMAS_DOS_INSIGHTS.every((t) => versoesDo(t.chave).length > 0);
}
