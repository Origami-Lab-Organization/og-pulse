-- Rode ANTES de aplicar supabase/migrations/20260721250000_employee_versions_no_overlap_
-- constraint.sql — essa migration adiciona uma constraint que rejeita qualquer par de
-- versões do mesmo colaborador com intervalos [effective_from, effective_until)
-- sobrepostos. Se já existir alguma sobreposição real nos dados (ex.: corrupção de
-- edições duplicadas, como já visto e corrigido nesta sessão para outros colaboradores),
-- o ALTER TABLE da migration falha. Esta query mostra qualquer sobreposição existente,
-- para corrigir antes.
--
-- Se não retornar nenhuma linha, é seguro rodar a migration diretamente.

SELECT
  e.nome,
  v1.id AS versao_1_id,
  v1.effective_from AS v1_de,
  v1.effective_until AS v1_ate,
  v2.id AS versao_2_id,
  v2.effective_from AS v2_de,
  v2.effective_until AS v2_ate
FROM public.employee_versions v1
JOIN public.employee_versions v2
  ON v1.employee_id = v2.employee_id
  AND v1.id < v2.id
  AND daterange(v1.effective_from, v1.effective_until, '[)')
      && daterange(v2.effective_from, v2.effective_until, '[)')
JOIN public.employees e ON e.id = v1.employee_id
ORDER BY e.nome, v1.effective_from;
