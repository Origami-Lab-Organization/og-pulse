-- Diagnóstico da transição Estagiária -> CLT da Kauany (24/04/2026), mesmo
-- roteiro usado para o Gabriel. Somente leitura — não altera nada.

-- 1. Cadastro atual.
SELECT id, nome, tipo_contratacao, data_admissao, salario_mensal, jornada_diaria
FROM public.employees
WHERE nome ILIKE '%Kauany%';

-- 2. Marcos financeiros (employee_versions) — confira: exatamente 1 versão
--    Estagiária terminando em 2026-04-24 (exclusivo) e 1 versão CLT começando
--    em 2026-04-24, sem duplicatas e sem gap/overlap entre elas.
SELECT id, effective_from, effective_until, tipo_contratacao, salario_mensal,
       jornada_diaria, total_benefits_cost, total_tools_cost, created_at
FROM public.employee_versions
WHERE employee_id = (SELECT id FROM public.employees WHERE nome ILIKE '%Kauany%')
ORDER BY effective_from, created_at;

-- 3. Benefícios/ferramentas ativos hoje (referência atual, usada no breakdown do modal).
SELECT 'beneficio' AS tipo, name, monthly_value AS valor, is_active
FROM public.employee_benefits
WHERE employee_id = (SELECT id FROM public.employees WHERE nome ILIKE '%Kauany%')
UNION ALL
SELECT 'ferramenta' AS tipo, name, monthly_cost AS valor, is_active
FROM public.employee_tools
WHERE employee_id = (SELECT id FROM public.employees WHERE nome ILIKE '%Kauany%');
