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
