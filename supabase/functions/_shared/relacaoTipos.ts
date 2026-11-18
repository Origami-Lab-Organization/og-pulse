/** Contratos da relação da Origami com uma empresa (US-0019); a regra está em relacao.ts. */

export type Relacao = "cliente_ativo" | "sendo_abordada" | "ja_foi_cliente" | "sem_sucesso";


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
  /** Está no cadastro de clientes (pelo CNPJ ou pela ligação da empresa da Prospecção). */
  cliente: boolean;
  projetos: ProjetoDaRelacao[];
  oportunidades: OportunidadeDaRelacao[];
}

export interface RelacaoDaEmpresa {
  relacao: Relacao;
  /** A última Perda foi "Pediu para parar": avisa, sem impedir (cenário 5). */
  pediuParaParar: boolean;
  /** Cliente ativo: o projeto aberto; já foi cliente: o último projeto. */
  projeto: ProjetoDaRelacao | null;
  /** Em andamento (cliente ativo ou sendo abordada), o Ganho (já foi cliente) ou a Perda. */
  oportunidade: OportunidadeDaRelacao | null;
}
