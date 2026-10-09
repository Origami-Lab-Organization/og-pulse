import { supabase } from '@/integrations/supabase/client';

/**
 * Acesso às tabelas de prospecção sem tipo gerado.
 *
 * `prospects`, `prospect_companies` e `prospect_activities` foram criadas nas migrations
 * 20260915110000 a 20260915130000 e ainda não constam de `src/integrations/supabase/types.ts`,
 * que é gerado a partir do banco. Sem isso, cada chamada precisaria do seu próprio cast.
 *
 * Um ponto de escape, não trinta: quando os tipos forem regerados, este arquivo some e os
 * services passam a usar `supabase.from(...)` direto, sem mais nenhuma mudança.
 */
export type TabelaDeProspeccao =
  | 'prospects'
  | 'prospect_companies'
  | 'prospect_contacts'
  | 'prospect_opportunity_contacts'
  | 'prospect_files'
  | 'prospect_activities'
  | 'prospect_tasks'
  | 'prospect_stage_changes'
  | 'prospect_company_partners';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentário acima
const clienteSemTipos = supabase as any;

export function tabela(nome: TabelaDeProspeccao) {
  return clienteSemTipos.from(nome);
}

/** RPCs da prospecção criadas depois da última geração de tipos (20260928160000). */
export type RpcDeProspeccao = 'set_prospect_stage' | 'mark_prospect_won' | 'save_prospect_company_receita';

export function rpc(nome: RpcDeProspeccao, args: Record<string, unknown>) {
  return clienteSemTipos.rpc(nome, args);
}
