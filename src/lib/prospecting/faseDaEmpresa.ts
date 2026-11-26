import { RELACOES_DA_CARTEIRA } from '@/lib/carteira.constants';
import type { ProspectWithCompany } from '@/types/prospect';
import type { Relacao } from '@/types/relacao';
import { ETAPA_QUALIFICACAO, ETAPAS_ENCERRADAS, FASE_DA_EMPRESA, type FaseDaEmpresa } from './faseDaEmpresa.constants';

const ativa = (o: ProspectWithCompany) => !ETAPAS_ENCERRADAS.includes(o.stage);

/** A Oportunidade que está andando: a mais avançada que não seja a qualificação, ou a qualificação. */
export function oportunidadeAtiva(oportunidades: readonly ProspectWithCompany[]): ProspectWithCompany | null {
  const ativas = oportunidades.filter(ativa);
  return ativas.find((o) => o.stage !== ETAPA_QUALIFICACAO) ?? ativas[0] ?? null;
}

/** US-0053: a fase da empresa, pela Oportunidade ativa, pela relação e por estar no Pulse. */
export function faseDaEmpresa(args: { noPulse: boolean; oportunidades: readonly ProspectWithCompany[]; relacao: Relacao | null }): FaseDaEmpresa {
  const { noPulse, oportunidades, relacao } = args;
  const andando = oportunidadeAtiva(oportunidades);
  if (andando) return andando.stage === ETAPA_QUALIFICACAO ? FASE_DA_EMPRESA.QUALIFICACAO : FASE_DA_EMPRESA.ANDAMENTO;
  if (relacao && RELACOES_DA_CARTEIRA.includes(relacao)) return FASE_DA_EMPRESA.CLIENTE;
  return noPulse ? FASE_DA_EMPRESA.CADASTRADA : FASE_DA_EMPRESA.BASE;
}
