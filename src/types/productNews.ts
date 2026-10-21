import type { CapabilityRequirement } from '@/lib/access/capabilities';
import type { PRODUCT_NEWS_ACTION, PRODUCT_NEWS_ORIGIN } from '@/lib/productNews.constants';

/**
 * Novidades do produto (ADR-0048): uma edição editorial por entrega, mostrada uma vez a
 * cada pessoa na entrada do app.
 */

/** Ícone do tópico — chave fechada, para o conteúdo não importar componente. */
export type ProductNewsIcon =
  | 'notebook'
  | 'bell'
  | 'kanban'
  | 'mail'
  | 'folder-input'
  | 'calendar'
  | 'package';

/** Arte do banner da edição. */
export type ProductNewsArt = 'meu-espaco';

export interface ProductNewsTopic {
  id: string;
  icon: ProductNewsIcon;
  title: string;
  /** Por que a entrega existe — o problema que ela resolve, em uma ou duas frases. */
  reason: string;
  /** O que dá para fazer, um item por funcionalidade. */
  features: readonly string[];
  /**
   * Mesma capacidade da tela anunciada. Ausente = todo mundo. Tópico de tela que a pessoa
   * não abre é ruído, e sugere um acesso que ela não tem (mesma regra da Central de Ajuda).
   */
  requiresCapability?: CapabilityRequirement;
}

export interface ProductNewsCall {
  label: string;
  href: string;
}

export interface ProductNewsEdition {
  /** Chave da leitura no banco. Edição nova = versão nova. */
  version: string;
  /** Só vê quem tinha conta antes disto: quem chegou depois já encontra a casa assim. */
  publishedAt: string;
  /** Rótulo pequeno acima do título ("Novidade"). */
  label: string;
  title: string;
  summary: string;
  art: ProductNewsArt;
  /** Ação principal, no lugar de "Continuar". */
  call?: ProductNewsCall;
  topics: readonly ProductNewsTopic[];
}

/** Como a pessoa saiu do anúncio — vai para o Amplitude. */
export type ProductNewsAction = (typeof PRODUCT_NEWS_ACTION)[keyof typeof PRODUCT_NEWS_ACTION];

export type ProductNewsOrigin = (typeof PRODUCT_NEWS_ORIGIN)[keyof typeof PRODUCT_NEWS_ORIGIN];
