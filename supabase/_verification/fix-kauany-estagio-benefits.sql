-- Correção pontual do histórico da Kauany Sebastiana Arantes
-- (id a5ffeaa3-b63a-469c-a922-2062fecef584), a partir da inspeção real da tabela
-- employee_versions em 21/07 (ver supabase/_verification/check-kauany-versions.sql).
-- NÃO é migration — rode manualmente no SQL Editor do Supabase, na ordem abaixo.
--
-- Diagnóstico: as 3 versões ESTÁGIO da Kauany (07/01→01/03, 01/03→20/03, 20/03→24/04)
-- têm total_benefits_cost = NULL. Igual ao caso do Gabriel (fix-gabriel-menor-
-- aprendiz-benefits.sql), a ausência de valor congelado faz resolveVersionSegments
-- (src/lib/payrollAnalysis.ts) cair no fallback `v.totalBenefitsCost ?? e.totalBenefitsCost`
-- e usar o total ATUAL/AO VIVO de employee_benefits (825,90 — VR/VA 800 + Colab+ 25,90,
-- valores de CLT) para meses em que ela era Estagiária. Pela regra vigente da Origami Lab
-- (Simples Nacional), todo Estagiário/Menor Aprendiz recebe R$400 VR/VA + R$25,90 Colab+
-- = R$425,90/mês — não R$825,90. Confirmado por execução real do código: um mês inteiro
-- em Estágio (março/2026, onde as 3 versões abaixo se mesclam numa única linha) retornava
-- benefitsAmount=825,90 em vez de 425,90 — uma distorção de ~400/mês.
--
-- Fora de escopo desta correção (não mexer):
--   - total_tools_cost: também NULL nas 3 versões, mas o valor correto para o período
--     Estágio ainda é uma pergunta em aberto (pendente de confirmação do usuário) — não
--     adivinhar aqui.
--   - id 45833ef5-3a05-44a4-98fc-238c58d1f70e (versão CLT de duração zero, 24/04→24/04):
--     inofensiva (sempre filtrada por resolveVersionSegments independente de ordem — já
--     verificado por execução real do código), fora do escopo deste fix. Não apagar aqui;
--     é uma limpeza de higiene opcional que fica para o usuário decidir separadamente.
--   - id 89e364b5-38ce-48fc-86f7-13fb3447eab9 (versão CLT aberta, effective_until NULL):
--     é a versão vigente, já reflete o cadastro atual — fora do escopo deste fix.

-- 1. Confere o estado atual antes da correção — as 3 linhas ESTAGIO abaixo devem
--    aparecer com total_benefits_cost NULL.
SELECT id, effective_from, effective_until, tipo_contratacao, salario_mensal,
       jornada_diaria, total_benefits_cost, total_tools_cost, total_monthly_cost_estimated
FROM public.employee_versions
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND id IN (
    'afade50d-324f-46cc-a6b1-a90b2f53cc62', -- ESTAGIO 07/01/2026 -> 01/03/2026
    'aae68df4-ad09-41da-bf6c-089d304dd554', -- ESTAGIO 01/03/2026 -> 20/03/2026
    '54ee31cb-2396-4d99-ac61-4cd26f0023ac'  -- ESTAGIO 20/03/2026 -> 24/04/2026
  )
ORDER BY effective_from;

-- 2. Congela o valor correto de benefícios (400 VR/VA + 25,90 Colab+) nas 3 versões
--    ESTAGIO da Kauany. Alvo por id exato (não por tipo_contratacao/employee_id
--    isolados) para não atingir nenhuma outra linha por engano; a condição extra
--    AND employee_id só é um cinto de segurança (id já é chave primária única) —
--    se algum id da lista não pertencesse à Kauany por engano de digitação, o
--    UPDATE simplesmente não atingiria nenhuma linha em vez de corrigir o
--    funcionário errado. Idempotente: rodar de novo grava o mesmo 425.90, sem
--    efeito colateral.
UPDATE public.employee_versions
SET total_benefits_cost = 425.90
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND id IN (
    'afade50d-324f-46cc-a6b1-a90b2f53cc62',
    'aae68df4-ad09-41da-bf6c-089d304dd554',
    '54ee31cb-2396-4d99-ac61-4cd26f0023ac'
  );

-- 3. Confere o resultado — as 3 linhas ESTAGIO devem mostrar total_benefits_cost =
--    425.90; total_tools_cost continua NULL (não tocado); as versões CLT (linha de
--    duração zero e a aberta) não devem aparecer alteradas por este script.
SELECT id, effective_from, effective_until, tipo_contratacao, salario_mensal,
       jornada_diaria, total_benefits_cost, total_tools_cost, total_monthly_cost_estimated
FROM public.employee_versions
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
ORDER BY effective_from, created_at;

-- 4. NÃO chamamos public.recalculate_employee_cost_snapshots() aqui (diferente do
--    fix do Gabriel). Motivo, confirmado lendo as migrations que definem a função
--    (20260519173000_weighted_employee_cost_snapshots.sql, reescrita em
--    20260721160000_employee_cost_snapshot_admission_termination_window.sql): ela
--    (e a calculate_employee_hourly_cost_for_month que agora usa por baixo) só lê
--    employee_versions.total_monthly_cost_estimated e jornada_diaria para recalcular
--    cost_per_hour de project_member_months/project_role_allocations/
--    project_timesheets — nunca total_benefits_cost nem total_tools_cost. Como este
--    fix só altera total_benefits_cost, chamar a função aqui não mudaria nenhum
--    cost_per_hour existente (seria um no-op para este caso específico), então
--    omitimos a chamada em vez de incluir um passo sem efeito real. O relatório
--    Folha de Pagamento / Custo x Hora (payrollAnalysis.ts / payrollHistory.ts) lê
--    total_benefits_cost direto do employee_versions em tempo de render no
--    front-end — não depende de nenhum recálculo/snapshot no banco, então nenhum
--    passo adicional é necessário para este valor aparecer corrigido nos relatórios.
