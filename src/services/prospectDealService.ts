import { supabase } from '@/integrations/supabase/client';
import type { ProspectBudgetLite, ProspectProjectLite } from '@/types/prospectDeal';

/**
 * O negócio do contato (29/09/2026): o orçamento e o projeto que nasceram dele.
 *
 * Eram da Oportunidade (`leads.budget_id`, `projects.lead_id`); a migração 20260929120000
 * reapontou os dois para o contato. Cada leitura passa pela RLS da própria tabela — quem
 * não tem `orcamento:ler` recebe "nenhum orçamento", não um erro, e a ficha do contato
 * continua abrindo.
 */
export async function fetchProspectBudget(prospectId: string): Promise<ProspectBudgetLite | null> {
  const { data, error } = await supabase
    .from('budgets')
    .select('id, budget_number, title, final_total, status')
    .eq('prospect_id', prospectId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProspectBudgetLite | null) ?? null;
}

export async function fetchProspectProject(prospectId: string): Promise<ProspectProjectLite | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ProspectProjectLite | null) ?? null;
}

/** Liga um orçamento recém-criado ao contato — o equivalente de `leads.budget_id`. */
export async function linkBudgetToProspect(budgetId: string, prospectId: string): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .update({ prospect_id: prospectId })
    .eq('id', budgetId);
  if (error) throw error;
}
