import type { CampoDaEmpresa, OrigemDaPessoa, PassoDaQualificacao, SecaoDaEmpresa, TipoDeEvento, TipoDeItemDoEstudo } from '@/lib/prospecting/faseDaEmpresa.constants';
import type { ProspectContactDB, ProspectOpportunityContact } from '@/types/prospect';
import type { ProspectCompanyPartnerDB } from '@/types/receita';

/** De onde a página da empresa foi aberta: a lista que o "← Empresas" devolve na hora (US-0053). */
export interface OrigemDaPagina {
  de: string;
}

/** Um passo do widget de qualificação: feito ou não, e onde se resolve na página. */
export interface PassoDoWidget {
  chave: PassoDaQualificacao;
  rotulo: string;
  feito: boolean;
  /** Campo que o "Preencher" abre; sem campo, o passo leva à seção. */
  campo: CampoDaEmpresa | null;
  secao: SecaoDaEmpresa | null;
}

/** Os números do histórico com a Origami. */
export interface NumerosDoHistorico {
  oportunidades: number;
  ganhos: number;
  perdas: number;
  projetos: number;
}

/** Um evento da linha do tempo do histórico. */
export interface EventoDoHistorico {
  id: string;
  tipo: TipoDeEvento;
  titulo: string;
  detalhe: string;
  data: string | null;
  href: string;
}

/** Um item de risco: o que se olha, o que se achou e se pede atenção. */
export interface ItemDeRisco {
  titulo: string;
  valor: string;
  detalhe?: string;
  atencao: boolean;
}

/** Campos do Pulse que a página grava sozinhos, sem regravar a empresa (US-0053). */
export interface CamposDaPagina {
  website?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  notes?: string | null;
}

/** Quem está sendo editado na página e se o widget da qualificação está aberto. */
export interface EdicaoDaEmpresa {
  editando: CampoDaEmpresa | null;
  editar: (campo: CampoDaEmpresa | null) => void;
  widgetAberto: boolean;
  abrirWidget: (aberto: boolean) => void;
  /** A aba aberta: uma seção por vez (26/11/2026). */
  aba: SecaoDaEmpresa;
  mostrar: (secao: SecaoDaEmpresa) => void;
}

/** Uma linha da tabela de Pessoas: contato do Pulse ou sócio da Receita, com origem e cargo. */
export interface PessoaDaEmpresa {
  chave: string;
  nome: string;
  origem: OrigemDaPessoa;
  cargo: string | null;
  /** O contato do Pulse; nulo para sócio que ainda não virou contato. */
  contato: ContatoDaPessoa | null;
  /** O vínculo com a Oportunidade ativa, com o papel. */
  vinculo: ProspectOpportunityContact | null;
  /** Sócio do Pulse que pode virar contato. */
  socio: ProspectCompanyPartnerDB | null;
}

export type ContatoDaPessoa = Pick<ProspectContactDB, 'id' | 'name' | 'role' | 'email' | 'phone' | 'linkedin_url' | 'instagram_url'>;

/** Um link, nota ou arquivo do Estudo da conta (`prospect_company_estudo`, US-0053). */
export interface ItemDoEstudoDaConta {
  id: string;
  tenant_id: string;
  company_id: string;
  tipo: TipoDeItemDoEstudo;
  titulo: string;
  /** Link: o endereço; arquivo: o link para abrir no OneDrive. */
  url: string | null;
  texto: string | null;
  drive_id: string | null;
  item_id: string | null;
  tamanho: number | null;
  created_by: string | null;
  created_at: string;
}

export type NovoItemDoEstudo = Pick<ItemDoEstudoDaConta, 'tipo' | 'titulo'> &
  Partial<Pick<ItemDoEstudoDaConta, 'url' | 'texto' | 'drive_id' | 'item_id' | 'tamanho'>>;

/** A pasta do Comercial no OneDrive, escolhida pelo admin (`onedrive_do_comercial`). */
export interface PastaDoComercial {
  tenant_id: string;
  drive_id: string;
  item_id: string;
  caminho: string;
  ligada_por: string | null;
  ligada_em: string;
}
