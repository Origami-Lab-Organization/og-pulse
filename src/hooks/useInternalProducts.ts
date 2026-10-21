import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { internalProductService } from '@/services/internalProductService';

export const INTERNAL_PRODUCTS_QUERY_KEY = 'internal-products';

/** Produtos internos do tenant de quem está logado, com investimento, equipe e roadmap. */
export function useInternalProducts() {
  const { employee } = useAuth();
  return useQuery({
    queryKey: [INTERNAL_PRODUCTS_QUERY_KEY, employee?.tenant_id],
    enabled: Boolean(employee?.tenant_id),
    queryFn: () => internalProductService.overview(),
  });
}
