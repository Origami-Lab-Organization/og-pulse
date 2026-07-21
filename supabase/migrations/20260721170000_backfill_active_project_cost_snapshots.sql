-- Backfill retroativo do cost_per_hour para projetos ATIVOS, usando a fórmula corrigida
-- de 20260721160000_employee_cost_snapshot_admission_termination_window.sql. Só rodar
-- depois de revisar supabase/_verification/employee-cost-per-hour-window-fix.sql com o
-- time (conferir contagem de linhas afetadas e delta em R$).
--
-- Escopo: apenas projetos com status = 'active'. Projetos 'planning'/'paused' ficam de
-- fora deste backfill — se um deles virar 'active' depois, seus dados históricos só
-- corrigem rodando public.recalculate_employee_cost_snapshots_for_active_projects()
-- de novo (registrado em .harness/tech-debt/log.md).

-- Backup dos valores atuais antes do overwrite — permite rollback via UPDATE simples
-- (ver seção "Como reverter" no plano). Precisa ser tabela versionada (não passo manual),
-- por boundaries.md ("não alterar schema Supabase sem migration versionada").
CREATE TABLE IF NOT EXISTS public._backup_cost_per_hour_20260721 (
  source_table text NOT NULL,
  row_id uuid NOT NULL,
  cost_per_hour numeric,
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, row_id)
);

INSERT INTO public._backup_cost_per_hour_20260721 (source_table, row_id, cost_per_hour)
SELECT 'project_member_months', pmm.id, pmm.cost_per_hour
FROM public.project_member_months pmm
JOIN public.project_members pm ON pm.id = pmm.project_member_id
JOIN public.projects p ON p.id = pm.project_id
WHERE p.status = 'active'
ON CONFLICT (source_table, row_id) DO NOTHING;

INSERT INTO public._backup_cost_per_hour_20260721 (source_table, row_id, cost_per_hour)
SELECT 'project_timesheets', pt.id, pt.cost_per_hour
FROM public.project_timesheets pt
JOIN public.projects p ON p.id = pt.project_id
WHERE p.status = 'active'
ON CONFLICT (source_table, row_id) DO NOTHING;

-- project_role_allocations é a fonte canônica de horas PLANEJADAS desde ADR-0006
-- (20260619170000_complete_role_allocations_cutover.sql) — precisa do mesmo backup e do
-- mesmo backfill que project_member_months/project_timesheets.
INSERT INTO public._backup_cost_per_hour_20260721 (source_table, row_id, cost_per_hour)
SELECT 'project_role_allocations', pra.id, pra.cost_per_hour
FROM public.project_role_allocations pra
JOIN public.projects p ON p.id = pra.project_id
WHERE p.status = 'active'
ON CONFLICT (source_table, row_id) DO NOTHING;

DO $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.recalculate_employee_cost_snapshots_for_active_projects();
  RAISE NOTICE 'cost_per_hour backfill (projetos ativos): % project_member_months, % project_role_allocations, % project_timesheets atualizados',
    r.updated_member_months, r.updated_role_allocations, r.updated_timesheets;
END $$;
