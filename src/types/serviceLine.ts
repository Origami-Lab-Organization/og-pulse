import { ICONES_DA_LINHA, ICONE_PADRAO_DA_LINHA, type IconeDaLinha } from '@/lib/catalogo.constants';

export interface ServiceLineDB {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  icone?: string;
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
  icone: IconeDaLinha;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceLineInput {
  name: string;
  description?: string;
  icone?: IconeDaLinha;
}

/** Valor desconhecido (banco à frente do front) cai no ícone padrão. */
const comoIcone = (valor: string | null | undefined): IconeDaLinha =>
  (ICONES_DA_LINHA as readonly string[]).includes(valor ?? '') ? (valor as IconeDaLinha) : ICONE_PADRAO_DA_LINHA;

export const dbToServiceLine = (db: ServiceLineDB): ServiceLine => ({
  id: db.id,
  tenantId: db.tenant_id,
  name: db.name,
  description: db.description,
  icone: comoIcone(db.icone),
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
  { value: 'product_studio', label: 'Dev. de Software' },
  { value: 'educacao_corporativa', label: 'Educação Corporativa' },
  { value: 'ventures', label: 'Ventures' },
] as const;

export const SERVICE_LINE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_LINE_OPTIONS.map((o) => [o.value, o.label])
);
