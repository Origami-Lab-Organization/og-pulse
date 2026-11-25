import { validateCNPJ } from '@/lib/masks';

/** US-0050: a filial tem 14 dígitos e a mesma raiz (8 primeiros) do CNPJ da matriz. */
export const DIGITOS_DO_CNPJ = 14;
const DIGITOS_DA_RAIZ = 8;

export type FilialValidada = { cnpj: string; erro: null } | { cnpj: null; erro: string };

const so = (valor: string) => valor.replace(/\D/g, '');

/** Confere o CNPJ digitado como filial da matriz; o banco confere de novo ao gravar. */
export function validarFilial(valor: string, matriz: string, filiais: readonly string[]): FilialValidada {
  const cnpj = so(valor);
  if (cnpj.length !== DIGITOS_DO_CNPJ) return { cnpj: null, erro: 'CNPJ incompleto.' };
  if (!validateCNPJ(cnpj)) return { cnpj: null, erro: 'CNPJ inválido.' };
  if (cnpj === matriz) return { cnpj: null, erro: 'Este é o CNPJ da matriz.' };
  if (cnpj.slice(0, DIGITOS_DA_RAIZ) !== matriz.slice(0, DIGITOS_DA_RAIZ)) return { cnpj: null, erro: 'Não é filial desta empresa.' };
  if (filiais.includes(cnpj)) return { cnpj: null, erro: 'Filial já cadastrada.' };
  return { cnpj, erro: null };
}
