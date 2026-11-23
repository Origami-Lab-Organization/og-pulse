import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { bantDaOportunidade } from '@/lib/prospecting/bant';
import {
  decidirEvidenciaBant,
  fetchEvidenciasBant,
  fetchEvidenciasBantDe,
  registrarEvidenciaBant,
} from '@/services/bantService';
import type { BantDaOportunidade, NovaEvidenciaBant, SituacaoEvidencia } from '@/types/bant';
import type { ProspectWithCompany } from '@/types/prospect';

const CHAVE = 'bant';
const CHAVE_DO_QUADRO = 'bant-quadro';

function invalidarBant(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [CHAVE] });
  qc.invalidateQueries({ queryKey: [CHAVE_DO_QUADRO] });
}

/** O BANT de uma oportunidade: as evidências e o estado, a nota e a meta (US-0022). */
export function useBant(prospect: ProspectWithCompany) {
  const consulta = useQuery({
    queryKey: [CHAVE, prospect.id],
    queryFn: () => fetchEvidenciasBant(prospect.id),
  });
  const evidencias = useMemo(() => consulta.data ?? [], [consulta.data]);
  const bant = useMemo(() => bantDaOportunidade(prospect, evidencias), [prospect, evidencias]);
  return { ...consulta, evidencias, bant };
}

/** O BANT de todas as oportunidades do quadro, numa leitura só. */
export function useBantDoQuadro(prospects: ProspectWithCompany[]): Map<string, BantDaOportunidade> {
  const ids = useMemo(() => prospects.map((p) => p.id).sort(), [prospects]);
  const { data = [] } = useQuery({
    queryKey: [CHAVE_DO_QUADRO, ids],
    queryFn: () => fetchEvidenciasBantDe(ids),
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
  return useMemo(() => {
    const porOportunidade = new Map<string, typeof data>();
    for (const e of data) porOportunidade.set(e.prospect_id, [...(porOportunidade.get(e.prospect_id) ?? []), e]);
    return new Map(prospects.map((p) => [p.id, bantDaOportunidade(p, porOportunidade.get(p.id) ?? [])]));
  }, [data, prospects]);
}

export function useRegistrarEvidenciaBant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nova: NovaEvidenciaBant) => registrarEvidenciaBant(nova),
    onSuccess: () => invalidarBant(qc),
    onError: (erro) => toast({ title: 'Não deu para salvar a evidência', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}

/** Aceitar ou recusar uma proposta da IA (US-0024): a decisão é sempre da pessoa. */
export function useDecidirEvidenciaBant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, situacao }: { id: string; situacao: Exclude<SituacaoEvidencia, 'proposta'> }) => decidirEvidenciaBant(id, situacao),
    onSuccess: (_, { situacao }) => {
      invalidarBant(qc);
      toast({ title: situacao === 'aceita' ? 'Evidência aceita' : 'Proposta recusada' });
    },
    onError: (erro) => toast({ title: 'Não deu para decidir a proposta', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}
