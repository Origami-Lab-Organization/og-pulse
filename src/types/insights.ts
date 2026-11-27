import type { ConfiancaDoTime } from '@/lib/prospecting/funcionarios.constants';
import type { EstadoDaProposta, StatusDoPedido, TemaDosInsights, TipoDeProposta } from '@/lib/prospecting/insights.constants';

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
  gerado_em: string;
  temas: Partial<Record<TemaDosInsights, ItemDoInsight[]>>;
}

export interface PedidoDeInsights {
  id: string;
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

export interface PropsDaDecisaoDaProposta {
  proposta: PropostaDePorte;
  podeDecidir: boolean;
  companyId: string;
}

export interface PropsDaAcaoDeGerar {
  companyId: string;
  pedido: PedidoDeInsights | null;
  pedidoAberto: boolean;
  jaTem: boolean;
}

export interface PropsDoSeletorDeVersao {
  versoes: VersaoDosInsights[];
  valor: string | undefined;
  onTrocar: (id: string) => void;
}

export interface PropsDoConteudoDaVersao {
  versao: VersaoDosInsights;
  propostas: PropostaDePorte[];
  companyId: string;
}
