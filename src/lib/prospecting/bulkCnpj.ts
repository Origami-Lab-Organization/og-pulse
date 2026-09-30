import { validateCNPJ } from '@/lib/masks';
import type { CnpjExtraction } from '@/types/bulkImport';

/**
 * CNPJs de um texto colado ou de um CSV (29/09/2026) — lista de feira, de sindicato, da Rede
 * Origami. Aceita com ou sem máscara, um por linha ou no meio de outras colunas.
 *
 * Só sequências de 14 dígitos (com a pontuação opcional do CNPJ) contam: CPF, telefone e CEP
 * têm outro tamanho e ficam de fora. Repetido entra uma vez; dígito verificador errado vai
 * para `invalidos`, com o texto como estava, para a pessoa achar na planilha.
 */
const PADRAO = /(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/g;

export const MAX_CNPJS_POR_LOTE = 500;

export function extractCnpjs(texto: string): CnpjExtraction {
  const validos: string[] = [];
  const invalidos: string[] = [];
  const vistos = new Set<string>();
  for (const achado of texto.match(PADRAO) ?? []) {
    const digitos = achado.replace(/\D/g, '');
    if (vistos.has(digitos)) continue;
    vistos.add(digitos);
    (validateCNPJ(digitos) ? validos : invalidos).push(validateCNPJ(digitos) ? digitos : achado);
  }
  return { validos, invalidos, excedente: Math.max(0, validos.length - MAX_CNPJS_POR_LOTE) };
}
