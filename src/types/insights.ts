import type { ConfiancaDoTime } from '@/lib/prospecting/funcionarios.constants';
import type { EstadoDaProposta, StatusDoPedido, TemaDoPedido, TemaDosInsights, TipoDeProposta } from '@/lib/prospecting/insights.constants';

/** Insights de IA no Estudo da conta (US-0057, migration 20261127160000). */

export interface FonteDoInsight {
  titulo?: string;
  url: string;
}

export interface ItemDoInsight {
  texto: string;
  fontes: FonteDoInsight[];
}

/** Uma geração: cada tema com os itens que têm fonte (o banco tira os outros). */
export interface VersaoDosInsights {
  id: string;
  tema: TemaDoPedido;
  gerado_em: string;
  temas: Partial<Record<TemaDosInsights, ItemDoInsight[]>>;
}

export interface PedidoDeInsights {
  id: string;
  tema: TemaDoPedido;
  status: StatusDoPedido;
  erro: string | null;
  pedido_em: string;
}

export interface PropostaDePorte {
  id: string;
  insight_id: string;
  tipo: TipoDeProposta;
  de: number;
  ate: number;
  confianca: ConfiancaDoTime;
  fonte: string;
  estado: EstadoDaProposta;
  decidida_em: string | null;
}

/** O pedido mais recente de cada tema e as versões de cada tema, da mais nova para a mais antiga. */
export interface InsightsPorTema {
  pedidoDo: (tema: TemaDoPedido) => PedidoDeInsights | null;
  versoesDo: (tema: TemaDoPedido) => VersaoDosInsights[];
  propostas: PropostaDePorte[];
}

export interface PropsDaAcaoDoTema {
  companyId: string;
  tema: TemaDoPedido;
  jaTem: boolean;
  destaque?: boolean;
}

export interface PropsDoBlocoDoTema {
  companyId: string;
  tema: TemaDosInsights;
  rotulo: string;
  insights: InsightsPorTema;
}

export interface PropsDoSeletorDeVersao {
  versoes: VersaoDosInsights[];
  valor: string | undefined;
  onTrocar: (id: string) => void;
}

export interface PropsDaPropostaNoPorte {
  companyId: string;
  proposta: PropostaDePorte;
}
