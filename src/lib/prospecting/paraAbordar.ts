import { nomeDaEmpresa, type EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import { BASE_PISO } from '@/lib/prospecting/faturamentoEstimado';
import { faturamentoDaSugestao, sugerirTipoDeConta } from '@/lib/prospecting/tipoDeConta';
import type { ItemParaAbordar, ResultadoParaAbordar, ResumoParaAbordar, TipoDeConta } from '@/types/prospect';

/** O tipo sugerido pelo faturamento da empresa (US-0008, cenário 3). */
export function tipoSugerido(empresa: EmpresaReceita): TipoDeConta | null {
  return sugerirTipoDeConta(faturamentoDaSugestao(empresa));
}

/** O tipo sugerido de cada empresa, para abrir a janela já preenchida. */
export function tiposSugeridos(empresas: EmpresaReceita[]): Record<string, TipoDeConta | null> {
  return Object.fromEntries(empresas.map((e) => [e.cnpj, tipoSugerido(e)]));
}

/** A empresa da lista como item do lote; o piso do porte não vira faturamento "Calculado". */
export function itemParaAbordar(empresa: EmpresaReceita, tipoConta: TipoDeConta): ItemParaAbordar {
  const estimado = empresa.faturamento_estimado != null && empresa.faturamento_base !== BASE_PISO
    ? Number(empresa.faturamento_estimado)
    : null;
  return { cnpj: empresa.cnpj, nome: nomeDaEmpresa(empresa), tipoConta, faturamentoEstimado: estimado };
}

/** Separa o resultado do lote para a mensagem (cenários 2, 5 e 10). */
export function resumirParaAbordar(resultados: ResultadoParaAbordar[]): ResumoParaAbordar {
  const resumo: ResumoParaAbordar = { abertas: [], emAndamento: [], falhas: [] };
  for (const { item, resultado, erro } of resultados) {
    if (erro || !resultado) resumo.falhas.push(item);
    else if ('prospect' in resultado) resumo.abertas.push({ item, prospect: resultado.prospect });
    else resumo.emAndamento.push({ item, oportunidade: resultado.emAndamento });
  }
  return resumo;
}

/** "Prumo", "Prumo e Tecno", "Prumo, Tecno e mais 3". */
export function listaDeNomes(nomes: string[], visiveis = 2): string {
  if (nomes.length <= visiveis) return nomes.join(' e ');
  const resto = nomes.length - visiveis;
  return `${nomes.slice(0, visiveis).join(', ')} e mais ${resto}`;
}
