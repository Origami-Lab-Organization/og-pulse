import { useMemo } from 'react';
import { useProspects } from '@/hooks/useProspects';
import type { ProspectStage } from '@/types/prospect';

const ETAPA_QUALIFICACAO: ProspectStage = 'qualificacao';

/** As oportunidades em Qualificação (US-0023): a lista e a contagem da aba da tela Empresas. */
export function useEmQualificacao() {
  const consulta = useProspects();
  const lista = useMemo(() => (consulta.data ?? []).filter((p) => p.stage === ETAPA_QUALIFICACAO), [consulta.data]);
  return { ...consulta, lista };
}
