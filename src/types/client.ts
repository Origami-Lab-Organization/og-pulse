export interface ClientDB {
  id: string;
  tenant_id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
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
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  companyName: string;
  tradingName?: string;
  cnpj?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
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
  bairro: db.bairro,
  cidade: db.cidade,
  estado: db.estado,
  status: db.status as 'active' | 'inactive',
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});
