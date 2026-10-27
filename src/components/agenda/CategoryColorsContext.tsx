import type { ReactNode } from 'react';
import type { OutlookCategory } from '@/types/microsoftGraph';
import { CategoryColorsContext } from './categoryColors';

interface CategoryColorsProviderProps {
  categories: OutlookCategory[] | undefined;
  children: ReactNode;
}

/** Entrega à grade a cor de cada categoria; sem lista, a grade fica sem cor de categoria. */
export function CategoryColorsProvider(props: CategoryColorsProviderProps) {
  const { categories, children } = props;
  const byName = new Map((categories ?? []).map((category) => [category.name, category.color]));
  return <CategoryColorsContext.Provider value={byName}>{children}</CategoryColorsContext.Provider>;
}
