/** Contratos da relação da Origami com uma empresa (US-0019); a regra está em relacao.ts. */

export type Relacao =
  | "cliente_ativo"
  | "sendo_abordada"
  | "ja_foi_cliente"
  | "retomar"
  | "nao_agora"
  | "descartada"
  | "sem_sucesso";

/** Decisão do time sobre a empresa na Base de empresas (US-0010). */
export type DecisaoDaBase = "descartada" | "nao_agora";

/** Motivos do descarte: lista própria, separada dos motivos de Perda (decisão de 16/11/2026). */
export type MotivoDoDescarte = "sem_fit" | "cliente_ou_parceiro" | "concorrente" | "dados_invalidos" | "outro";

/** A decisão ativa (não desfeita) sobre a empresa. */
export interface DecisaoDaRelacao {
  id: string;
  decisao: DecisaoDaBase;
  motivo: MotivoDoDescarte | null;
  texto: string | null;
  /** "Não agora": quando voltar. AAAA-MM-DD. */
  voltar_em: string | null;
  /** "Não agora" que veio da Perda na Qualificação. */
  prospect_id: string | null;
  decidida_por: string | null;
  decidida_em: string;
}


export interface OportunidadeDaRelacao {
  id: string;
  title: string | null;
  stage: string;
  owner_id: string | null;
  discard_reason: string | null;
  /** Quando encerrou (Ganho ou Perda) ou, em andamento, quando foi aberta. AAAA-MM-DD. */
  data: string | null;
}

export interface ProjetoDaRelacao {
  id: string;
  name: string;
  status: string;
  /** Fim, ou começo se não terminou. AAAA-MM-DD. */
  data: string | null;
}

/** Tudo que o tenant sabe de uma empresa (pela raiz do CNPJ). */
export interface DadosDaRelacao {
  projetos: ProjetoDaRelacao[];
  oportunidades: OportunidadeDaRelacao[];
  /** Descartada ou "Não agora", ainda valendo (US-0010). */
  decisao?: DecisaoDaRelacao | null;
  /** Marca Parceiro (US-0051): própria, ao lado da relação; não muda o cálculo. */
  parceiro?: boolean;
  /** Cliente antes do Pulse, marcado pelo admin com o ano (US-0051). */
  antesDoPulse?: number | null;
}

export interface RelacaoDaEmpresa {
  relacao: Relacao;
  /** A última Perda foi "Pediu para parar": avisa, sem impedir (cenário 5). */
  pediuParaParar: boolean;
  /** Cliente ativo: o projeto aberto; já foi cliente: o último projeto. */
  projeto: ProjetoDaRelacao | null;
  /** Em andamento (cliente ativo ou sendo abordada), o Ganho (já foi cliente) ou a Perda. */
  oportunidade: OportunidadeDaRelacao | null;
  /** Retomar, Não agora ou Descartada: a decisão do time (US-0010). */
  decisao?: DecisaoDaRelacao | null;
  /** Já foi cliente antes do Pulse: o ano marcado pelo admin (US-0051). */
  antesDoPulse?: number | null;
}
