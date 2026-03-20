export interface MaterialDB {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  unit_cost: number;
  sku: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  unitCost: number;
  sku: string | null;
  status: 'active' | 'inactive';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialInput {
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  unitCost: number;
  sku?: string;
  status: 'active' | 'inactive';
  notes?: string;
}

export const dbToMaterial = (db: MaterialDB): Material => ({
  id: db.id,
  tenantId: db.tenant_id,
  name: db.name,
  description: db.description,
  category: db.category,
  unit: db.unit,
  unitCost: db.unit_cost,
  sku: db.sku,
  status: db.status as 'active' | 'inactive',
  notes: db.notes,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const MATERIAL_CATEGORIES = [
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'material_escritorio', label: 'Material de Escritório' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'insumos', label: 'Insumos de Projeto' },
  { value: 'outros', label: 'Outros' },
] as const;

export const MATERIAL_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'pc', label: 'Peça (pç)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm2', label: 'Metro² (m²)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'hr', label: 'Hora (hr)' },
] as const;
