import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useInformarFaturamento, useInformarFuncionarios } from '@/hooks/usePaginaDaEmpresa';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { ORIGEM_DO_TIME } from '@/lib/prospecting/funcionarios.constants';
import {
  CHAVE_DAS_PROPOSTAS, CHAVE_DO_PEDIDO, CHAVE_DO_RUNNER, CHAVE_DOS_INSIGHTS, ESTADO_DA_PROPOSTA,
  INTERVALO_DO_PEDIDO_MS, INTERVALO_DO_RUNNER_MS, PEDIDO_ABERTO, STATUS_DO_PEDIDO, TIPO_DE_PROPOSTA,
} from '@/lib/prospecting/insights.constants';
import {
  decidirProposta, pedirInsights, propostasDePorte, runnerDisponivel, ultimoPedido, versoesDosInsights,
} from '@/services/insightsService';
import type { PedidoDeInsights, PropostaDePorte } from '@/types/insights';

/** Insights de IA da empresa (US-0057): versões, propostas de porte e o último pedido. */

/** Só para quem gera: o runner dessa pessoa está dando sinal. */
export function useRunnerDisponivel(ativo: boolean) {
  return useQuery({
    queryKey: [CHAVE_DO_RUNNER],
    queryFn: runnerDisponivel,
    enabled: ativo,
    refetchInterval: INTERVALO_DO_RUNNER_MS,
  });
}

const aberto = (pedido: PedidoDeInsights | null | undefined) => !!pedido && PEDIDO_ABERTO.has(pedido.status);

/** Quando o pedido acompanhado termina, recarrega versões e propostas. */
function useAoTerminar(companyId: string, pedido: PedidoDeInsights | null | undefined) {
  const qc = useQueryClient();
  const anterior = useRef(pedido?.status);
  useEffect(() => {
    const estava = anterior.current;
    anterior.current = pedido?.status;
    if (!estava || !PEDIDO_ABERTO.has(estava) || pedido?.status !== STATUS_DO_PEDIDO.PRONTO) return;
    qc.invalidateQueries({ queryKey: [CHAVE_DOS_INSIGHTS, companyId] });
    qc.invalidateQueries({ queryKey: [CHAVE_DAS_PROPOSTAS, companyId] });
  }, [companyId, pedido?.status, qc]);
}

export function useInsightsDaEmpresa(companyId: string) {
  const pedido = useQuery({
    queryKey: [CHAVE_DO_PEDIDO, companyId],
    queryFn: () => ultimoPedido(companyId),
    refetchInterval: (q) => (aberto(q.state.data) ? INTERVALO_DO_PEDIDO_MS : false),
  });
  const versoes = useQuery({ queryKey: [CHAVE_DOS_INSIGHTS, companyId], queryFn: () => versoesDosInsights(companyId) });
  const propostas = useQuery({ queryKey: [CHAVE_DAS_PROPOSTAS, companyId], queryFn: () => propostasDePorte(companyId) });
  useAoTerminar(companyId, pedido.data);
  return {
    pedido: pedido.data ?? null,
    pedidoAberto: aberto(pedido.data),
    versoes: versoes.data ?? [],
    propostas: propostas.data ?? [],
    carregando: versoes.isLoading || pedido.isLoading,
  };
}

export function usePedirInsights(companyId: string) {
  const { employee } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pedirInsights(companyId, employee!.tenant_id),
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
