import { ProductNewsDialog } from '@/components/product-news/ProductNewsDialog';
import { useOpenWhenFree, useProductNews } from '@/hooks/useProductNews';
import { useTour } from '@/hooks/useTour';

/**
 * Entrada das novidades do produto (ADR-0048). O tour de quem acabou de chegar tem
 * prioridade: o anúncio espera ele terminar, e qualquer outro diálogo aberto fechar.
 */
export function ProductNews() {
  const { edition, markRead } = useProductNews();
  const tour = useTour();
  const ready = Boolean(edition) && !tour.isLoading && !tour.shouldOpen;
  const open = useOpenWhenFree(ready);

  if (!edition) return null;
  return <ProductNewsDialog edition={edition} open={open} onDone={markRead} />;
}
