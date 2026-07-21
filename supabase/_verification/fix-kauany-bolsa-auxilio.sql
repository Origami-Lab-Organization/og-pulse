-- Correção pontual do histórico da Kauany Sebastiana Arantes
-- (id a5ffeaa3-b63a-469c-a922-2062fecef584), a partir da inspeção real da tabela
-- employee_versions em 21/07 (ver supabase/_verification/check-kauany-versions.sql).
-- NÃO é migration — rode manualmente no SQL Editor do Supabase, na ordem abaixo.
--
-- Diagnóstico: bolsa_auxilio nunca foi um campo versionado em employee_versions
-- (coluna adicionada agora em supabase/migrations/20260721180000_employee_versions_
-- bolsa_auxilio.sql) — calculateEmployeeCost usa bolsa_auxilio (não salario_mensal)
-- como base para o tipo ESTAGIO, e esse valor sempre foi lido do cadastro atual
-- (employees.bolsa_auxilio), nunca congelado por versão. A Kauany foi Estagiária e
-- depois virou CLT; seu cadastro atual tem bolsa_auxilio = 0 (valor correto para
-- CLT, que não usa esse campo), então as 3 versões ESTAGIO abaixo caem no fallback
-- `v.bolsaAuxilio ?? e.bolsaAuxilio` (resolveVersionSegments, payrollAnalysis.ts) e
-- usam 0 em vez do valor real da bolsa — o mês inteiro em Estágio aparece com
-- salário-base R$0 no relatório Folha de Pagamento / Custo x Hora. Confirmado por
-- execução real do código (calculatePayrollAnalysisRow) com as 5 versões reais da
-- Kauany: baseAmount de janeiro cai de R$967,74 (esperado, proporcional a partir da
-- admissão em 07/01) para R$0 quando bolsa_auxilio das versões ESTAGIO é NULL.
--
-- Valor correto: R$1200/mês (mesmo valor já registrado em salario_mensal nessas 3
-- linhas — aparentemente usado como valor de referência por quem criou as versões,
-- ainda que o código de cálculo não leia salario_mensal para ESTAGIO). Confirmado
-- pelo usuário como o valor real da bolsa-auxílio dela no período.
--
-- Fora de escopo desta correção (não mexer):
--   - total_benefits_cost / total_tools_cost: já corrigidos em passo anterior
--     (fix-kauany-estagio-benefits.sql) — não tocar aqui.
--   - valor_contrato_pj e dividendos: mesma lacuna arquitetural (não versionados,
--     sempre lidos do cadastro atual) para os tipos PJ e SOCIO respectivamente —
--     confirmado como fora de escopo pelo usuário para esta rodada. Não mexer.
--   - id 45833ef5-3a05-44a4-98fc-238c58d1f70e (versão CLT de duração zero,
--     24/04→24/04): inofensiva (sempre filtrada por resolveVersionSegments,
--     independente de ordem — já verificado por execução real do código), fora do
--     escopo deste fix. Não apagar aqui.
--   - id 89e364b5-38ce-48fc-86f7-13fb3447eab9 (versão CLT aberta, effective_until
--     NULL): é a versão vigente, já reflete o cadastro atual. CLT não lê
--     bolsa_auxilio em nenhum ponto do cálculo (calculateEmployeeCost usa apenas
--     salario_bruto para CLT/MENOR_APRENDIZ) — deixar NULL aqui é correto e
--     harmless; fora do escopo deste fix.

-- 1. Confere o estado atual antes da correção — as 3 linhas ESTAGIO abaixo devem
--    aparecer com bolsa_auxilio NULL.
SELECT id, effective_from, effective_until, tipo_contratacao, salario_mensal,
       jornada_diaria, bolsa_auxilio, total_benefits_cost, total_tools_cost,
       total_monthly_cost_estimated
FROM public.employee_versions
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND id IN (
    'afade50d-324f-46cc-a6b1-a90b2f53cc62', -- ESTAGIO 07/01/2026 -> 01/03/2026
    'aae68df4-ad09-41da-bf6c-089d304dd554', -- ESTAGIO 01/03/2026 -> 20/03/2026
    '54ee31cb-2396-4d99-ac61-4cd26f0023ac'  -- ESTAGIO 20/03/2026 -> 24/04/2026
  )
ORDER BY effective_from;

-- 2. Congela o valor correto da bolsa-auxílio (R$1200/mês) nas 3 versões ESTAGIO
--    da Kauany. Alvo por id exato (não por tipo_contratacao/employee_id isolados)
--    para não atingir nenhuma outra linha por engano; a condição extra
--    AND employee_id só é um cinto de segurança (id já é chave primária única) —
--    se algum id da lista não pertencesse à Kauany por engano de digitação, o
--    UPDATE simplesmente não atingiria nenhuma linha em vez de corrigir o
--    funcionário errado. Idempotente: rodar de novo grava o mesmo 1200, sem
--    efeito colateral.
UPDATE public.employee_versions
SET bolsa_auxilio = 1200
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND id IN (
    'afade50d-324f-46cc-a6b1-a90b2f53cc62',
    'aae68df4-ad09-41da-bf6c-089d304dd554',
    '54ee31cb-2396-4d99-ac61-4cd26f0023ac'
  );

-- 3. Confere o resultado — as 3 linhas ESTAGIO devem mostrar bolsa_auxilio = 1200;
--    total_benefits_cost/total_tools_cost continuam com o valor já corrigido em
--    passo anterior (não tocados por este script); as versões CLT (linha de
--    duração zero e a aberta) não devem aparecer alteradas por este script —
--    bolsa_auxilio permanece NULL nelas, o que é esperado (CLT não lê esse campo).
SELECT id, effective_from, effective_until, tipo_contratacao, salario_mensal,
       jornada_diaria, bolsa_auxilio, total_benefits_cost, total_tools_cost,
       total_monthly_cost_estimated
FROM public.employee_versions
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
ORDER BY effective_from, created_at;

-- 4. NÃO chamamos public.recalculate_employee_cost_snapshots() aqui (mesmo
--    raciocínio do passo 4 de fix-kauany-estagio-benefits.sql, confirmado de novo
--    por leitura direta em vez de assumir que este caso espelha aquele). Lendo
--    calculate_employee_hourly_cost_for_month na sua definição mais recente
--    (supabase/migrations/20260721160000_employee_cost_snapshot_admission_
--    termination_window.sql): a CTE version_segments só seleciona
--    ev.total_monthly_cost_estimated e ev.jornada_diaria de employee_versions —
--    bolsa_auxilio não aparece em nenhum ponto da função (confirmado por grep em
--    todo supabase/migrations/ por "bolsa_auxilio" cruzado com as definições de
--    calculate_employee_hourly_cost_for_month / recalculate_employee_cost_
--    snapshots: nenhuma ocorrência). Como este fix só altera
--    employee_versions.bolsa_auxilio (não total_monthly_cost_estimated), chamar a
--    função aqui seria um no-op para este caso específico — nenhum cost_per_hour
--    de project_member_months/project_role_allocations/project_timesheets muda.
--    O relatório Folha de Pagamento / Custo x Hora (payrollAnalysis.ts /
--    payrollHistory.ts) lê bolsa_auxilio direto do employee_versions em tempo de
--    render no front-end — não depende de nenhum recálculo/snapshot no banco,
--    então nenhum passo adicional é necessário para este valor aparecer corrigido
--    nos relatórios.
