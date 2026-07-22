-- Diagnóstico do INSS Patronal zerado do Bruno Mestanza na Folha de Pagamento
-- (julho/2026, mês seguinte ao desligamento em junho/2026). Só leitura — não altera nada.
--
-- Hipótese: employeeService.update() engole silenciosamente falhas ao criar
-- employee_versions (src/services/employeeService.ts:552-555), deixando um gap na
-- linha do tempo que faz o cálculo da folha (resolveVersionSegments,
-- src/lib/payrollAnalysis.ts:206-219) cair no fallback "cadastro atual" para
-- reconstruir junho — mesmo padrão já visto e corrigido para Rafael, Kauany e Enzo
-- (ver supabase/migrations/20260519*_fix_*_employee_cost_history.sql).

-- 1. Cadastro atual.
SELECT id, nome, tipo_contratacao, status, data_admissao, salario_mensal, jornada_diaria
FROM public.employees
WHERE nome ILIKE '%Bruno%Mestanza%' OR nome ILIKE '%Mestanza%';

-- 2. Registro de desligamento — data efetiva usada por `terminatedPrevMonth`.
SELECT et.id, et.employee_id, et.termination_date, et.status, et.created_at
FROM public.employee_terminations et
JOIN public.employees e ON e.id = et.employee_id
WHERE e.nome ILIKE '%Mestanza%';

-- 3. Linha do tempo de employee_versions — confira se cobre integralmente o período
--    de admissão até o desligamento, sem gap em junho/2026. `gap_antes` != null e > 0
--    indica um trecho sem versão, que cairia no fallback de dados atuais.
SELECT
  id,
  effective_from,
  effective_until,
  tipo_contratacao,
  salario_mensal,
  jornada_diaria,
  created_at,
  effective_from - LAG(effective_until) OVER (ORDER BY effective_from) AS gap_antes
FROM public.employee_versions
WHERE employee_id = (SELECT id FROM public.employees WHERE nome ILIKE '%Mestanza%')
ORDER BY effective_from, created_at;

-- 4. Confirma se existe ALGUMA versão cobrindo junho/2026 inteiro (1 a 30).
--    Se não retornar nenhuma linha, é o gap que zera o INSS de julho.
SELECT *
FROM public.employee_versions
WHERE employee_id = (SELECT id FROM public.employees WHERE nome ILIKE '%Mestanza%')
  AND effective_from <= '2026-06-30'
  AND (effective_until IS NULL OR effective_until > '2026-06-01');
