/** Contratos do runner de insights (US-0057). */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Dono {
  userId: string;
  tenantId: string;
}

export interface Conexao {
  pulse: SupabaseClient;
  dono: Dono;
}

export interface Pedido {
  id: string;
  company_id: string;
}

export interface EmpresaDoPedido {
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  site: string | null;
  cidade: string | null;
  uf: string | null;
  ramo: string | null;
}
