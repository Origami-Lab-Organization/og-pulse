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

/** O bloco pedido (US-0057); todos = os quatro temas e o porte de uma vez (pedidos antigos). */
export type TemaDoPedido = 'todos' | 'produtos' | 'clientes' | 'concorrentes' | 'noticias' | 'porte';

export interface Pedido {
  id: string;
  company_id: string;
  tema: TemaDoPedido;
  /** O que quem pediu quer que a IA busque (opcional). */
  orientacao: string | null;
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
