-- Correção pontual do histórico do Gabriel Arantes Silva
-- (id 276eae25-c7a8-42fb-94ba-d5391cf7c0d7), a partir da inspeção real da tabela
-- employee_versions em 21/07. NÃO é migration — rode manualmente no SQL Editor do
-- Supabase, na ordem abaixo.
--
-- Diagnóstico: 6 tentativas de salvar a transição Menor Aprendiz -> CLT em ~7 minutos
-- (30/06, 21:20-21:27), com o código antigo (antes das correções de
-- employeeVersionService.createVersion), deixaram o histórico fragmentado:
-- duplicata exata do período [01/06, 30/06), um fragmento redundante [30/06, 01/07)
-- (o CLT já começa em 30/06), duas linhas de duração zero (01/07 a 01/07) e um
-- intervalo invertido (effective_from 01/07 > effective_until 01/06). Além disso,
-- NENHUMA versão Menor Aprendiz tem total_benefits_cost preenchido — por isso todo
-- mês anterior à transição caía no valor ATUAL (CLT) do cadastro, não em 0/NULL.

-- 1. Remove os 5 fragmentos corrompidos dos testes de 30/06.
DELETE FROM public.employee_versions
WHERE id IN (
  '02ee02c6-3a14-47bd-acd2-aed7b58447d9', -- duplicata de 4ca5f0b7 (mesmo período [01/06,30/06), sem total_monthly_cost_estimated)
  'ab41bdbf-c275-4595-9b6d-21739c4369ef', -- fragmento redundante [30/06, 01/07) — CLT já começa em 30/06
  'e3a93078-897f-41fb-a274-3b631ace421f', -- intervalo de duração zero (01/07 a 01/07)
  'b54dabe8-7385-45a1-b739-4bafb70d84f6', -- duplicata do intervalo de duração zero acima
  'd17e98b7-a553-4373-b063-5d59997a227a'  -- intervalo invertido (effective_from 01/07 > effective_until 01/06)
);

-- 2. Congela o valor correto de benefícios (400 VR/VA + 25,90 Colab+) em TODAS as
--    versões Menor Aprendiz do Gabriel — nenhuma tinha total_benefits_cost preenchido.
UPDATE public.employee_versions
SET total_benefits_cost = 425.90
WHERE employee_id = '276eae25-c7a8-42fb-94ba-d5391cf7c0d7'
  AND tipo_contratacao = 'MENOR_APRENDIZ';

-- 3. Confere o resultado — deve sobrar uma sequência limpa, sem sobreposição/gap/inversão,
--    terminando na versão CLT aberta (effective_until NULL).
SELECT id, effective_from, effective_until, tipo_contratacao, salario_mensal,
       jornada_diaria, total_benefits_cost, total_monthly_cost_estimated
FROM public.employee_versions
WHERE employee_id = '276eae25-c7a8-42fb-94ba-d5391cf7c0d7'
ORDER BY effective_from;

-- 4. Recalcula os snapshots de custo/hora dos PROJETOS do Gabriel (mesma tabela usada
--    por project_role_allocations/project_member_months/project_timesheets).
SELECT public.recalculate_employee_cost_snapshots('276eae25-c7a8-42fb-94ba-d5391cf7c0d7');

-- 5. IMPORTANTE — confira também o cadastro ATUAL de benefícios (aba Benefícios do
--    Gabriel). Se a soma dos itens ATIVOS hoje já estiver dobrada (ex.: dois VR/VA
--    ativos), a duplicação está lá, não em employee_versions, e o mês corrente (CLT)
--    também vai mostrar valor errado até ser corrigido na tela. Esta query só lê,
--    não apaga nada — revise antes de desativar algo manualmente:
SELECT id, name, monthly_value, is_active, created_at
FROM public.employee_benefits
WHERE employee_id = '276eae25-c7a8-42fb-94ba-d5391cf7c0d7'
ORDER BY created_at;
