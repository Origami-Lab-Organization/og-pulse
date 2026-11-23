/**
 * BANT da oportunidade (US-0022): Budget, Authority, Need, Timing. Cada letra tem uma lista de
 * evidências; o estado da letra é o da evidência aceita mais recente, ou o indício que o Pulse
 * tira dos próprios dados quando ninguém disse nada ainda.
 */

export type LetraBant = 'B' | 'A' | 'N' | 'T';

export type EstadoBant = 'nao_sei' | 'indicio' | 'confirmado' | 'nao_atende';

/** Quem trouxe a evidência: a pessoa, a IA (que só propõe) ou o próprio Pulse (indício por regra). */
export type OrigemEvidencia = 'pessoa' | 'ia' | 'pulse';

export type SituacaoEvidencia = 'proposta' | 'aceita' | 'recusada';

/** Linha de `prospect_bant_evidencias`. */
export interface EvidenciaBantDB {
  id: string;
  tenant_id: string;
  prospect_id: string;
  letra: LetraBant;
  estado: EstadoBant;
  texto: string;
  fonte: string | null;
  origem: Exclude<OrigemEvidencia, 'pulse'>;
  situacao: SituacaoEvidencia;
  created_by: string | null;
  decidida_por: string | null;
  decidida_em: string | null;
  created_at: string;
}

/** Indício que o Pulse tira dos dados que já tem (regra, sem IA — ADR-0042). */
export interface IndicioDoPulse {
  letra: LetraBant;
  texto: string;
  fonte: string;
}

export interface LetraDoBant {
  letra: LetraBant;
  estado: EstadoBant;
  /** A evidência que define o estado agora: aceita, ou o indício do Pulse; nula sem nenhuma. */
  evidencia: EvidenciaBantDB | null;
  indicio: IndicioDoPulse | null;
}

export interface BantDaOportunidade {
  letras: Record<LetraBant, LetraDoBant>;
  /** 0 a 100: pontos (indício 1, confirmado 2) ÷ 8, com os indícios do Pulse. */
  nota: number;
  /**
   * A nota só das evidências aceitas, sem os indícios do Pulse (US-0038). É ela que decide a
   * entrada em "Oportunidade qualificada", na tela, no MCP e no banco.
   */
  notaComprovada: number;
  /** Meta da etapa atual; nula nos desfechos. */
  meta: number | null;
  temNaoAtende: boolean;
  /** Propostas da IA esperando a decisão da pessoa. */
  propostas: EvidenciaBantDB[];
}

/** O que a pessoa (ou a IA, pelo MCP) grava. */
export interface NovaEvidenciaBant {
  prospect_id: string;
  letra: LetraBant;
  estado: EstadoBant;
  texto: string;
  fonte?: string | null;
}
