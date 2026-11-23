-- Projetos — metas do portfólio (US-0036, 23/11/2026).
--
-- Meta de receita do ano e meta de margem bruta do portfólio, por tenant e ano. O portfólio
-- compara a receita esperada no ano e a margem bruta projetada dos projetos ativos com elas.
-- Provisório até as metas virem da Estratégia, quando ela estiver no Pulse.
--
-- A meta de margem do portfólio é própria (decisão do Victor, 23/11/2026), separada da meta
-- de margem de cada projeto (`financial_settings.gross_margin_target_percent`, com vigência).
--
-- Leitura: quem vê o portfólio (`portfolio:ler`). Escrita: `configuracao:editar`, a mesma
-- capacidade das configurações financeiras; não nasce capacidade nova. Sem DELETE: meta se
-- corrige, não se apaga.
--
-- Rollback: supabase/rollback/20261124120000_metas_do_portfolio_rollback.sql

CREATE TABLE IF NOT EXISTS public.portfolio_goals (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  revenue_target numeric(14, 2) NOT NULL CHECK (revenue_target >= 0),
  gross_margin_target_percent numeric(5, 2) NOT NULL CHECK (gross_margin_target_percent > 0 AND gross_margin_target_percent < 100),
  updated_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, year)
);

COMMENT ON TABLE public.portfolio_goals IS
  'Metas do portfólio por ano (US-0036): receita do ano e margem bruta. Provisório até virem da Estratégia.';

CREATE TRIGGER set_portfolio_goals_updated_at
  BEFORE UPDATE ON public.portfolio_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.portfolio_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio readers can view portfolio goals"
  ON public.portfolio_goals FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'portfolio:ler'));

CREATE POLICY "Settings editors can insert portfolio goals"
  ON public.portfolio_goals FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));

CREATE POLICY "Settings editors can update portfolio goals"
  ON public.portfolio_goals FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'configuracao:editar'));
