import { funcionariosPrevistos } from '@/lib/prospecting/faturamentoEstimado';
import { RAIS_IMPROVAVEL, RAIS_INCOMPLETA } from '@/lib/prospecting/funcionarios.constants';
import type { EmpresaParaModelo } from '@/types/filtrosReceita';

/** Ramos que registram os funcionários em outro CNPJ do grupo: a RAIS baixa ali é esperada. */
function ramoForaDaRegra(cnae: string): boolean {
  return RAIS_IMPROVAVEL.DIVISOES_FORA.includes(cnae.slice(0, 2)) || RAIS_IMPROVAVEL.GRUPOS_FORA.includes(cnae.slice(0, 4));
}

export interface FuncionariosDaBase {
  /** O número que vale: a RAIS, ou a estimativa quando a RAIS é improvável. */
  funcionarios: number | null;
  /** A RAIS como veio, guardada para a tela mostrar no detalhe. */
  rais: number | null;
  estimados: boolean;
}

/**
 * Funcionários de uma empresa da Base (US-0054): a RAIS, salvo quando ela é improvável para o
 * porte (regra em `RAIS_IMPROVAVEL`); aí vale a estimativa por empresas parecidas. Usada pela
 * carga da VPS, para a lista, os filtros, a ordem e o fit concordarem com a página da empresa.
 */
export function funcionariosDaBase(cnae: string, rais: number | null, empresa: EmpresaParaModelo, hoje: string): FuncionariosDaBase {
  const semRegra = { funcionarios: rais, rais, estimados: false };
  if (rais == null || rais >= RAIS_IMPROVAVEL.RAIS_ABAIXO_DE) return semRegra;
  if ((empresa.capital ?? 0) < RAIS_IMPROVAVEL.CAPITAL_A_PARTIR_DE || ramoForaDaRegra(cnae)) return semRegra;
  const previsto = Math.round(funcionariosPrevistos(empresa, hoje));
  if (previsto < RAIS_IMPROVAVEL.ESTIMATIVA_A_PARTIR_DE) return semRegra;
  return { funcionarios: previsto, rais, estimados: true };
}

/**
 * "RAIS em 1 de 23 estabelecimentos" (US-0054): quando a RAIS achou funcionário em menos da metade
 * dos estabelecimentos (matriz e filiais ativas) de uma empresa com filiais. Nulo quando não há o
 * que avisar.
 */
export function coberturaDaRais(e: { filiais_ativas?: number | null; unidades_com_funcionarios?: number | null }): string | null {
  const filiais = e.filiais_ativas ?? 0;
  if (filiais < RAIS_INCOMPLETA.FILIAIS_A_PARTIR_DE) return null;
  const estabelecimentos = filiais + 1;
  const comRais = e.unidades_com_funcionarios ?? 0;
  if (comRais * 2 >= estabelecimentos) return null;
  return `RAIS em ${comRais.toLocaleString('pt-BR')} de ${estabelecimentos.toLocaleString('pt-BR')} estabelecimentos`;
}
