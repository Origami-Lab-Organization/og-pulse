import type { PROJECT_KIND } from '@/lib/projectKind.constants';

export type ProjectKind = (typeof PROJECT_KIND)[keyof typeof PROJECT_KIND];

/** As duas marcas do banco de onde o tipo do projeto é derivado. */
export interface ProjectKindFlags {
  is_billable?: boolean | null;
  is_internal_product?: boolean | null;
}
