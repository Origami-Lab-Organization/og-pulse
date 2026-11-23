import type { MotivoDoDescarte } from '@/types/relacao';

/** A empresa que recebe a decisão: o CNPJ (14 dígitos) e o nome, que vai no aviso do sino. */
export interface EmpresaParaDecidir {
  cnpj: string;
  nome: string;
}

/** Descartar uma ou várias empresas da Base de empresas (US-0010). */
export interface PedidoDeDescarte {
  empresas: EmpresaParaDecidir[];
  motivo: MotivoDoDescarte;
  /** Obrigatório no "Outro motivo". */
  texto: string | null;
}

/** "Não agora" com a data para voltar; da Qualificação, com a oportunidade perdida. */
export interface PedidoDeNaoAgora {
  empresas: EmpresaParaDecidir[];
  /** AAAA-MM-DD. */
  voltarEm: string;
  prospectId?: string | null;
}

/** O que a janela da Base de empresas faz: descartar ou marcar "Não agora". */
export type ModoDaDecisao = 'descartar' | 'nao_agora';
