export interface ServiceLineDB {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceLine {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceLineInput {
  name: string;
  description?: string;
}

export const dbToServiceLine = (db: ServiceLineDB): ServiceLine => ({
  id: db.id,
  tenantId: db.tenant_id,
  name: db.name,
  description: db.description,
  isActive: db.is_active,
  sortOrder: db.sort_order ?? 0,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/**
 * Linhas de serviço fixas usadas para classificar projetos (`projects.service_line`).
 * Vivia em `src/types/lead.ts` até a Prospecção absorver as Oportunidades (29/09/2026).
 */
export const SERVICE_LINE_OPTIONS = [
  { value: 'financiamento_inovacao', label: 'Financiamento da Inovação' },
  { value: 'consultoria_estrategica', label: 'Consultoria Estratégica' },
  { value: 'product_studio', label: 'Product Studio' },
  { value: 'educacao_corporativa', label: 'Educação Corporativa' },
  { value: 'ventures', label: 'Ventures' },
] as const;

export const SERVICE_LINE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_LINE_OPTIONS.map((o) => [o.value, o.label])
);
