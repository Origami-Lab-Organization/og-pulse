export interface ClientDB {
  id: string;
  tenant_id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  segment: string | null;
  website: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  tenantId: string;
  companyName: string;
  tradingName: string | null;
  cnpj: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  logoUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  segment: string | null;
  website: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ClientContactDB {
  id: string;
  client_id: string;
  tenant_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ClientContactInput {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CreateClientInput {
  companyName: string;
  tradingName?: string;
  cnpj?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  logoUrl?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  segment?: string;
  website?: string;
  notes?: string;
  contacts?: ClientContactInput[];
  status: 'active' | 'inactive';
}

export const dbToClient = (db: ClientDB): Client => ({
  id: db.id,
  tenantId: db.tenant_id,
  companyName: db.company_name,
  tradingName: db.trading_name,
  cnpj: db.cnpj,
  cep: db.cep,
  logradouro: db.logradouro,
  numero: db.numero,
  complemento: db.complemento,
  bairro: db.bairro,
  cidade: db.cidade,
  estado: db.estado,
  logoUrl: db.logo_url,
  contactName: db.contact_name,
  contactEmail: db.contact_email,
  contactPhone: db.contact_phone,
  segment: db.segment,
  website: db.website,
  notes: db.notes,
  status: db.status as 'active' | 'inactive',
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});
