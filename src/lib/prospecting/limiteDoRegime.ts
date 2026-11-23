import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { LIMITE_DO_LUCRO_REAL, textoDoFaturamento } from './faturamentoEstimado';

/**
 * Regime tributário como limite do faturamento estimado (US-0018). A base da Receita na VPS
 * não tem o regime; ele vem da BrasilAPI nas empresas que já estão no Pulse
 * (`prospect_companies.regime_tributario`), pela relação por forma de tributação que a Receita
 * publica a partir da ECF (cerca de dois anos de atraso).
 *
 * - **Lucro Presumido** só vale para quem faturou até R$ 78 mi no ano anterior (Lei 9.718/1998,
 *   art. 13): a estimativa acima disso fica em R$ 78 mi.
 * - **Lucro Real** não é piso (qualquer empresa pode optar por ele): só um sinal no tooltip.
 */

const PRESUMIDO = /presumido/i;
const REAL = /lucro\s+real/i;

const noAno = (ano: number | null | undefined) => (ano ? ` em ${ano}` : '');

/** A estimativa acima de R$ 78 mi numa empresa do Lucro Presumido fica em R$ 78 mi. */
export function comLimiteDoRegime<T extends EmpresaReceita>(empresa: T): T {
  const valor = empresa.faturamento_estimado == null ? null : Number(empresa.faturamento_estimado);
  if (!PRESUMIDO.test(empresa.regime_tributario ?? '') || valor == null || valor <= LIMITE_DO_LUCRO_REAL) return empresa;
  return { ...empresa, faturamento_estimado: LIMITE_DO_LUCRO_REAL, faturamento_sem_limite: valor };
}

/** O que o regime diz da estimativa, para o tooltip e a ficha; nulo quando não diz nada. */
export function notaDoRegime(empresa: EmpresaReceita): string | null {
  const ano = noAno(empresa.regime_tributario_ano);
  if (empresa.faturamento_sem_limite != null && empresa.faturamento_base) {
    const conta = textoDoFaturamento(empresa.faturamento_sem_limite, empresa.faturamento_base);
    return `Limitado pelo regime: no Lucro Presumido${ano}, que só vale para quem faturou até R$ 78 mi no ano anterior (Lei 9.718/1998, art. 13). A conta dava ${conta}.`;
  }
  if (REAL.test(empresa.regime_tributario ?? '')) {
    return `No Lucro Real${ano}: obrigatório acima de R$ 78 mi, mas qualquer empresa pode optar por ele, então não muda a estimativa.`;
  }
  return null;
}
