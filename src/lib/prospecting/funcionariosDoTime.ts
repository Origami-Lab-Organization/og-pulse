import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { BASE_RAIS, estimarPorFuncionarios } from '@/lib/prospecting/faturamentoEstimado';

/**
 * Funcionários confirmados pelo time (US-0020): ficam no lugar da RAIS e refazem o faturamento
 * estimado por eles, com a mesma conta da carga. A ordem e os filtros da base continuam pela
 * RAIS, porque são calculados na VPS.
 */
export function comFuncionariosDoTime<T extends EmpresaReceita>(empresa: T): T {
  const informados = empresa.funcionarios_informados;
  if (informados == null) return empresa;
  const capital = empresa.capital_social == null ? null : Number(empresa.capital_social);
  const estimado = estimarPorFuncionarios(empresa.cnae_principal, informados, capital, empresa.natureza_juridica ?? null);
  const faturamento = estimado == null ? {} : { faturamento_estimado: estimado, faturamento_base: BASE_RAIS };
  return { ...empresa, funcionarios: informados, funcionarios_do_time: true, ...faturamento };
}
