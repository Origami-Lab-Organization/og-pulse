import type { Opcao } from '@/types/filtrosReceita';
import type { MotivoDoDescarte, Relacao } from '@/types/relacao';

/**
 * Regras de tela do "Descartar" e do "Não agora" na Base de empresas (US-0010). A gravação, a
 * guarda de quem decidiu e o aviso do sino moram no banco (migration 20261123200000).
 */

/** Lista própria, separada dos motivos de Perda (decisão de 16/11/2026). */
export const MOTIVOS_DO_DESCARTE: ReadonlyArray<Opcao<MotivoDoDescarte>> = [
  { valor: 'sem_fit', rotulo: 'Sem fit' },
  { valor: 'cliente_ou_parceiro', rotulo: 'Já é cliente ou parceiro' },
  { valor: 'concorrente', rotulo: 'Concorrente' },
  { valor: 'dados_invalidos', rotulo: 'Dados inválidos' },
  { valor: 'outro', rotulo: 'Outro motivo' },
];

export const MOTIVO_OUTRO: MotivoDoDescarte = 'outro';
export const LIMITE_DO_TEXTO = 500;

export function rotuloDoMotivoDoDescarte(motivo: MotivoDoDescarte | null): string {
  return MOTIVOS_DO_DESCARTE.find((m) => m.valor === motivo)?.rotulo ?? 'Descartada';
}

/** Prazos do "Não agora"; o padrão são os 90 dias de 16/11/2026. */
export const PRAZOS_DO_NAO_AGORA: ReadonlyArray<Opcao<number>> = [
  { valor: 3, rotulo: '3 meses' },
  { valor: 6, rotulo: '6 meses' },
  { valor: 12, rotulo: '12 meses' },
];
export const PRAZO_PADRAO = 3;

const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-DD no fuso de quem usa. */
export function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/** A data de voltar, daqui a tantos meses. */
export function dataDaVolta(meses: number, hoje = new Date()): string {
  const volta = new Date(hoje);
  volta.setMonth(volta.getMonth() + meses);
  return dataLocal(volta);
}

/** Amanhã: a primeira data que o "Não agora" aceita. */
export const amanha = (hoje = new Date()): string => dataDaVolta(0, new Date(hoje.getTime() + 86_400_000));

/**
 * Empresa com oportunidade em andamento (ou cliente ativo) não é descartada nem marcada pela
 * base: o caminho é a Perda na oportunidade (cenário 7).
 */
const EM_ANDAMENTO: ReadonlySet<Relacao> = new Set(['cliente_ativo', 'sendo_abordada']);

export const podeDecidirNaBase = (relacao: Relacao | null | undefined): boolean => !relacao || !EM_ANDAMENTO.has(relacao);
