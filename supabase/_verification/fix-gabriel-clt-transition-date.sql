-- Correção da data de vigência da transição Menor Aprendiz -> CLT do Gabriel
-- Arantes Silva (id 276eae25-c7a8-42fb-94ba-d5391cf7c0d7). NÃO é migration — rode
-- manualmente no SQL Editor do Supabase, na ordem abaixo.
--
-- Diagnóstico: a versão CLT ficou com effective_from = '2026-06-30' (deveria ser
-- '2026-07-01' — Gabriel foi Menor Aprendiz ATÉ 30/06, CLT a PARTIR de 01/07). Como
-- 30/06/2026 é terça-feira (dia útil), esse único dia contava como CLT dentro de
-- junho, inflando o valor de benefícios do mês de R$425,90 para R$444,95 (confirmado
-- rodando o cálculo real com os dois limites de data).

-- 1. Confere o estado atual antes de alterar.
SELECT id, effective_from, effective_until, tipo_contratacao, total_benefits_cost
FROM public.employee_versions
WHERE employee_id = '276eae25-c7a8-42fb-94ba-d5391cf7c0d7'
ORDER BY effective_from;

-- 2. Ajusta o limite: Menor Aprendiz vai até 01/07 (exclusivo), CLT começa em 01/07.
UPDATE public.employee_versions
SET effective_until = '2026-07-01'
WHERE id = '4ca5f0b7-822d-465b-a39a-27c7c4240631'; -- versão Menor Aprendiz de junho

UPDATE public.employee_versions
SET effective_from = '2026-07-01'
WHERE id = 'b867befb-cd04-4029-80d8-de7c0e8d7f3f'; -- versão CLT aberta

-- 3. Confere o resultado — Menor Aprendiz deve terminar em 01/07, CLT deve começar em 01/07.
SELECT id, effective_from, effective_until, tipo_contratacao, total_benefits_cost
FROM public.employee_versions
WHERE employee_id = '276eae25-c7a8-42fb-94ba-d5391cf7c0d7'
ORDER BY effective_from;

-- 4. Recalcula os snapshots de custo/hora dos projetos do Gabriel.
SELECT public.recalculate_employee_cost_snapshots('276eae25-c7a8-42fb-94ba-d5391cf7c0d7');
