-- ─────────────────────────────────────────────────────────────────────────────
-- Supressão de papel orçado na aba Equipe (v2.2 item 2)
--
-- Uma "vaga orçada" (papel herdado do orçamento ainda sem pessoa) é derivada de
-- budget_roles e não tinha linha própria — por isso não podia ser editada nem
-- excluída. Agora ela é MATERIALIZADA como uma linha real em project_team_rows
-- (row_type='vacancy', budget_role_id preenchido).
--
-- Excluir um papel orçado não pode alterar o orçamento (budget_roles é histórico
-- imutável da proposta aprovada). Então a exclusão é uma SUPRESSÃO por soft-delete:
-- marca deleted_at na linha materializada. A derivação passa a ignorar budget_roles
-- que já têm linha materializada (ativa ou suprimida), então o papel não reaparece.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.project_team_rows
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.project_team_rows.deleted_at
  IS 'Soft-delete de vaga materializada (papel orçado removido do projeto sem alterar o orçamento).';
