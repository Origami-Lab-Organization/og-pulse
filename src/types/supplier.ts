export interface SupplierDB {
  id: string;
  tenant_id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  companyName: string;
  tradingName: string | null;
  cnpj: string | null;
  category: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierInput {
  companyName: string;
  tradingName?: string;
  cnpj?: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  notes?: string;
  status: 'active' | 'inactive';
}

export const dbToSupplier = (db: SupplierDB): Supplier => ({
  id: db.id,
  tenantId: db.tenant_id,
  companyName: db.company_name,
  tradingName: db.trading_name,
  cnpj: db.cnpj,
  category: db.category,
  contactName: db.contact_name,
  contactEmail: db.contact_email,
  contactPhone: db.contact_phone,
  cep: db.cep,
  logradouro: db.logradouro,
  numero: db.numero,
  complemento: db.complemento,
  bairro: db.bairro,
  cidade: db.cidade,
  estado: db.estado,
  notes: db.notes,
  status: db.status as 'active' | 'inactive',
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const SUPPLIER_CATEGORIES = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'recursos_humanos', label: 'Recursos Humanos' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'contabilidade', label: 'Contabilidade' },
  { value: 'outros', label: 'Outros' },
] as const;
