import { PRODUCT_NEWS_MAX_SECONDS } from '@/lib/productNews.constants';
import type { CapabilityRequirement } from '@/lib/access/capabilities';
import type { ProductNewsEdition } from '@/types/productNews';

/**
 * Regras das novidades do produto (ADR-0048). Puras: o hook e a tela consomem, e nenhum
 * dos dois decide sozinho quem vê o quê.
 */

/**
 * Só vê a edição quem tinha conta antes da publicação. Quem chegou depois já encontra o
 * produto assim, e anunciar como novidade seria estranho. Sem data, não vê.
 */
export function isEligibleForEdition(accountCreatedAt: string | undefined, publishedAt: string): boolean {
  if (!accountCreatedAt) return false;
  return new Date(accountCreatedAt).getTime() < new Date(publishedAt).getTime();
}

/**
 * A edição com os tópicos que a pessoa alcança, pela mesma capacidade da tela anunciada.
 * Sem tópico sobrando, não há o que anunciar: `null`.
 */
export function editionForViewer(
  edition: ProductNewsEdition,
  can: (required: CapabilityRequirement) => boolean,
): ProductNewsEdition | null {
  const topics = edition.topics.filter(
    (topic) => !topic.requiresCapability || can(topic.requiresCapability),
  );
  return topics.length ? { ...edition, topics } : null;
}

/** Segundos com uma casa, do início até agora, com teto — vai no evento do Amplitude. */
export function secondsSince(startedAt: number, now: number): number {
  const seconds = Math.round(Math.max(0, now - startedAt) / 100) / 10;
  return Math.min(PRODUCT_NEWS_MAX_SECONDS, seconds);
}
