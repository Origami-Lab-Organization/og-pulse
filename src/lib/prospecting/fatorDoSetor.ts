import { divisaoDoCnae, nomeDoRamo, setorDoCnae } from '@/lib/prospecting/cnae';
import type { CalibracaoDoSetor, SetorCalibrado } from '@/types/filtrosReceita';
import CALIBRACAO from './calibracaoPorSetor.json';

/**
 * Calibração por setor do faturamento pela RAIS (US-0018), com os casos de faturamento que o
 * time informa no Pulse (scripts/receita/calibrar-por-setor.ts). Vale o ramo (divisão da
 * CNAE) quando ele tem casos suficientes; senão o setor (seção); senão nenhum, e fica a conta
 * geral. Começa vazia e cresce conforme o time informa faturamentos.
 */

interface Calibracao {
  minimo_de_casos: number;
  erro_alvo: number;
  setores: Record<string, SetorCalibrado>;
}

const C = CALIBRACAO as Calibracao;

export const MINIMO_DE_CASOS = C.minimo_de_casos;
export const ERRO_ALVO = C.erro_alvo;

/** A calibração que vale para a CNAE: a do ramo, senão a do setor; nula sem nenhuma. */
export function calibracaoDoSetor(cnae: string): CalibracaoDoSetor | null {
  const divisao = divisaoDoCnae(cnae);
  const ramo = C.setores[divisao];
  if (ramo) return { ...ramo, nome: `ramo ${divisao}${nomeDoRamo(divisao) ? ` (${nomeDoRamo(divisao)})` : ''}` };
  const secao = setorDoCnae(cnae);
  const setor = secao ? C.setores[secao] : undefined;
  return setor ? { ...setor, nome: `setor ${secao}` } : null;
}

/** O fator do setor, ou 1 sem calibração própria. */
export const fatorDoSetor = (cnae: string): number => calibracaoDoSetor(cnae)?.fator ?? 1;
