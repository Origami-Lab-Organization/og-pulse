import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { BASE_RAIS, estimarPorFuncionariosConfiaveis } from '@/lib/prospecting/faturamentoEstimado';
import { FAIXAS_DO_LINKEDIN } from '@/lib/prospecting/funcionarios.constants';

const faixa = (valor: string | null | undefined) => FAIXAS_DO_LINKEDIN.find((f) => f.valor === valor) ?? null;

/** "201 a 500"; nulo para faixa desconhecida. */
export const rotuloDaFaixa = (valor: string | null | undefined): string | null => faixa(valor)?.rotulo ?? null;

/** O ponto médio da faixa do LinkedIn, que entra nas contas (US-0054). */
export const meioDaFaixa = (valor: string | null | undefined): number | null => faixa(valor)?.meio ?? null;

/**
 * Os funcionários que o time informou: o número exato, senão o ponto médio da faixa do LinkedIn
 * (US-0020, US-0054). Nulo quando o time não informou nada e vale a RAIS.
 */
export function funcionariosDoTime(e: { funcionarios_informados?: number | null; funcionarios_faixa?: string | null }): number | null {
  return e.funcionarios_informados ?? meioDaFaixa(e.funcionarios_faixa);
}

/**
 * Funcionários do time (US-0020, US-0054): ficam no lugar da RAIS e refazem o faturamento
 * estimado por eles, com a mesma conta da carga. A ordem e os filtros da base continuam pela
 * VPS.
 */
export function comFuncionariosDoTime<T extends EmpresaReceita>(empresa: T): T {
  const informados = funcionariosDoTime(empresa);
  if (informados == null) return empresa;
  const estimado = estimarPorFuncionariosConfiaveis(empresa.cnae_principal, informados);
  const faturamento = estimado == null ? {} : { faturamento_estimado: estimado, faturamento_base: BASE_RAIS };
  return { ...empresa, funcionarios: informados, funcionarios_do_time: true, ...faturamento };
}
