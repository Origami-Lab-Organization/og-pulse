export interface BenefitDB {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Benefit {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  value: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBenefitInput {
  name: string;
  description?: string;
  value: number;
}

export const dbToBenefit = (db: BenefitDB): Benefit => ({
  id: db.id,
  tenantId: db.tenant_id,
  name: db.name,
  description: db.description,
  value: db.value,
  isActive: db.is_active,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});
