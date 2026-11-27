import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import type { ProspectStage } from '@/types/prospect';
import type { DadosDaRelacao, RelacaoDaEmpresa } from '@/types/relacao';

/** Atividade secundária com a descrição da CNAE. */
export interface AtividadeSecundaria {
  codigo: string;
  descricao: string | null;
}

/** Tudo que a base sabe de uma empresa, para a ficha (US-0007). */
export interface EmpresaDaFicha extends EmpresaReceita {
  cnaes_secundarios: string[];
  secundarias: AtividadeSecundaria[];
  natureza_juridica: string | null;
  natureza_descricao: string | null;
  unidades_com_funcionarios: number | null;
  filiais_ativas: number;
  socios: number;
  divida_em_cobranca: number | null;
  inscricoes_divida: number | null;
  tem_email: boolean;
  tem_telefone: boolean;
  /** US-0053: a Base não tem a empresa; a ficha veio do que o Pulse guarda. */
  so_no_pulse?: boolean;
  /** US-0053: situação da Receita, só na ficha que veio do Pulse (na Base é sempre matriz ativa). */
  situacao_cadastral?: string | null;
}

/** Sócio da empresa, com minimização (ADR-0041): sem CPF nem faixa etária. */
export interface SocioDaFicha {
  nome: string;
  qualificacao_codigo: string | null;
  entrada: string | null;
  tipo: string | null;
  /** Raiz do CNPJ (8 dígitos), só quando o sócio é empresa. */
  cnpj: string | null;
}

/** Contato público da empresa na Receita. */
export interface ContatoDaFicha {
  email: string | null;
  telefone_1: string | null;
  telefone_2: string | null;
}

/** Oportunidade em andamento da empresa na Prospecção. */
export interface OportunidadeDaFicha {
  id: string;
  title: string | null;
  stage: ProspectStage;
  owner_id: string | null;
}

export interface FichaReceita {
  empresa: EmpresaDaFicha;
  contato: ContatoDaFicha | null;
  socios: SocioDaFicha[];
  oportunidades: OportunidadeDaFicha[];
  /** Relação da Origami com a empresa e o histórico dela (US-0019). */
  relacao?: RelacaoDaEmpresa | null;
  historico?: DadosDaRelacao | null;
  /** Marca Parceiro (US-0051), ao lado da relação. */
  parceiro?: boolean;
  relacao_indisponivel?: boolean;
}
