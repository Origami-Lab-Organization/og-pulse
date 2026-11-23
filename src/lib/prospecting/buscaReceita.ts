import type { BuscaReceita } from '@/types/filtrosReceita';

/**
 * Busca da base da Receita (US-0005). A mesma regra está na Edge Function `empresas-receita`
 * (lerBusca), que é quem decide de verdade; aqui ela só diz o que a tela manda e como avisa.
 *
 * - Só números (a pontuação do CNPJ não conta), a partir de 5: o começo do CNPJ. Ignora os
 *   filtros; os 14 de uma filial acham a matriz.
 * - Outro texto, a partir de 3 letras: parte do nome ou o nome inteiro da cidade, somado aos
 *   filtros.
 */

export const BUSCA_MINIMA = 3;
export const CNPJ_MINIMO = 5;
export const BUSCA_MAXIMA = 100;
const CNPJ_COMPLETO = 14;

const VAZIA: BuscaReceita = { tipo: 'vazia' };

export function lerBusca(texto: string): BuscaReceita {
  const limpo = texto.trim().replace(/\s+/g, ' ').slice(0, BUSCA_MAXIMA);
  if (!limpo) return VAZIA;
  const digitos = limpo.replace(/[\s./-]/g, '');
  if (/^\d+$/.test(digitos)) {
    if (digitos.length < CNPJ_MINIMO) return { tipo: 'curta', aviso: `Digite ao menos ${CNPJ_MINIMO} números do CNPJ` };
    return { tipo: 'cnpj', digitos: digitos.slice(0, CNPJ_COMPLETO) };
  }
  return limpo.length < BUSCA_MINIMA ? { tipo: 'curta', aviso: `Digite ao menos ${BUSCA_MINIMA} letras` } : { tipo: 'texto', termo: limpo };
}

/** O que vai no pedido: só CNPJ ou texto; vazia e curta não buscam. */
export function buscaDoPedido(busca: BuscaReceita): string | undefined {
  if (busca.tipo === 'cnpj') return busca.digitos;
  if (busca.tipo === 'texto') return busca.termo;
  return undefined;
}

/** O aviso de texto curto, ou nulo quando a busca já vale. */
export function avisoDaBusca(busca: BuscaReceita): string | null {
  return busca.tipo === 'curta' ? busca.aviso : null;
}

export function cnpjCompleto(busca: BuscaReceita): boolean {
  return busca.tipo === 'cnpj' && busca.digitos.length === CNPJ_COMPLETO;
}

/** CNPJ completo de filial: a lista mostra a matriz, que tem a mesma raiz e outro CNPJ. */
export function buscouFilial(busca: BuscaReceita, cnpjAchado: string | undefined): boolean {
  return cnpjCompleto(busca) && !!cnpjAchado && busca.tipo === 'cnpj' && cnpjAchado !== busca.digitos;
}

// A busca fica guardada no navegador entre visitas, como os filtros (decisão de 17/11/2026).
const CHAVE = 'pulse:empresas-receita:busca:v1';

export function buscaDoNavegador(): string {
  try {
    const salva = localStorage.getItem(CHAVE);
    return typeof salva === 'string' ? salva.slice(0, BUSCA_MAXIMA) : '';
  } catch {
    return '';
  }
}

export function guardarBusca(texto: string): void {
  try {
    if (texto) localStorage.setItem(CHAVE, texto);
    else localStorage.removeItem(CHAVE);
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a busca só não fica para a próxima visita.
  }
}
