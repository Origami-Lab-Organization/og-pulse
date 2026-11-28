import { valuesAreHidden } from '@/lib/hideValuesStore';
import { HIDDEN_VALUE_MASK } from '@/lib/formatters';
import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { FAIXAS_DE_FATURAMENTO, FAIXAS_DE_FUNCIONARIOS } from '@/lib/prospecting/faixasDeFaturamento.constants';
import { FATURAMENTO_DA_BASE } from '@/lib/prospecting/faseDaEmpresa.constants';

const naFaixa = (faixas: ReadonlyArray<{ piso: number; rotulo: string }>, valor: number) =>
  (faixas.find((f) => valor >= f.piso) ?? faixas[faixas.length - 1]).rotulo;

/** "R$ 100 a 200 mi": a faixa fixa em que o faturamento estimado cai (US-0056). */
export function faixaDoFaturamento(valor: number): string {
  return valuesAreHidden() ? HIDDEN_VALUE_MASK : naFaixa(FAIXAS_DE_FATURAMENTO, valor);
}

/** "250 a 499": a faixa do filtro em que os funcionários estimados caem (US-0056). */
export function faixaDosFuncionarios(n: number): string {
  return naFaixa(FAIXAS_DE_FUNCIONARIOS, n);
}

/** O time informou o faturamento (estimado ou apurado), e não só guardou o cálculo da Base. */
export function faturamentoInformadoPeloTime(e: Pick<EmpresaReceita, 'faturamento_informado' | 'faturamento_informado_base'>): boolean {
  return e.faturamento_informado != null && !!e.faturamento_informado_base && e.faturamento_informado_base !== FATURAMENTO_DA_BASE;
}

/**
 * O faturamento aparece em faixa quando o time não informou nem o faturamento nem o número exato
 * de funcionários (US-0056). A faixa do LinkedIn continua em faixa: é uma faixa.
 */
export function faturamentoEmFaixa(e: EmpresaReceita): boolean {
  return !faturamentoInformadoPeloTime(e) && e.funcionarios_informados == null;
}
