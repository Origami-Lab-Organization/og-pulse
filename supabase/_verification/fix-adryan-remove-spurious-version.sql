-- Remove o marco financeiro espúrio do Adryan de Oliveira Marques
-- (id 022b0a55-0263-48ef-ae9f-488d531c596d, confirmado pela URL da tela de Histórico).
-- NÃO é migration — rode manualmente no SQL Editor do Supabase.
--
-- Diagnóstico (confirmado pelo Admin em 2026-07-30): o Histórico de Versões mostra um
-- marco "Vigência: 16/07/2026 → 21/07/2026" (rótulo da tela — 1 dia a menos que o valor
-- real salvo, ver nota sobre bug de fuso horário no fim deste comentário) com
-- EXATAMENTE os mesmos dados de antes e depois (salário R$2.000, encargos R$191,11,
-- mesmos benefícios/ferramentas/jornada) — não representa nenhuma mudança real, não
-- deveria existir. Confirmado por SELECT direto: os valores REAIS salvos são
-- effective_from = 2026-07-17, effective_until = 2026-07-22 (id
-- 66908401-5ae8-4e40-ae90-36c26c683364); o "Cadastro inicial" é
-- 2026-06-01 → 2026-06-01 (id d2bf67b7-40ae-4c73-bea3-a0e14f013cb1), duração zero.
--
-- Efeito do bug: esse marco fatia julho em 3 segmentos (01-16, 17-21, 22-31) em vez de
-- 1 contínuo. Cada segmento é limitado a 100% individualmente (Math.min(1,...) em
-- calendarFractionForWindow, payrollAnalysis.ts), mas nenhuma fração sozinha chega a
-- 100% — a soma dos três (16+5+10 = 31 dias reais ÷ 30) passa de 100%, dando
-- R$2.066,66 em vez de R$2.000,00 no Salário Base de agosto (mês de caixa = julho).
-- Verificado batendo exatamente com o valor reportado: 2000×16/30 + 2000×5/30 +
-- 2000×10/30 = 1066,67 + 333,33 + 666,67 = 2066,67 (arredondamento de centavo à parte,
-- mesma conclusão: 31 dias reais ÷ 30, somados em 3 pedaços, estoura 100%).
--
-- Diferente do caso do Gabriel (ADR-0015 / fix-gabriel-employee-version-date.sql), aqui
-- NÃO existe nenhuma outra versão adjacente cobrindo o período — o único outro marco do
-- Adryan é o "Cadastro inicial" (01/06→01/06, duração zero, já inofensivo e sempre
-- filtrado por resolveVersionSegments). Apagar o marco espúrio deixa julho sem nenhuma
-- versão cobrindo o mês inteiro — resolveVersionSegments cai no fallback de
-- "currentSegment" (dados atuais do cadastro), que já é R$2.000 e o restante idêntico,
-- restaurando o segmento único e contínuo. Por isso um DELETE simples basta — não
-- precisa ajustar effective_until/effective_from de nenhuma outra linha.
--
-- NOTA À PARTE (não corrigido aqui, fora de escopo deste script): a tela "Histórico de
-- Versões" (EmployeeVersionsTimeline.tsx) parece exibir effective_from/effective_until
-- com 1 dia a menos do que o valor real salvo (16/07 exibido vs. 17/07 real; 31/05
-- exibido vs. 01/06 real) — padrão clássico de parsing de data-sem-hora como UTC exibida
-- em fuso local (Brasil, UTC-3). Investigar e corrigir à parte, fora desta correção
-- pontual de dado.

-- 1. Confere o estado atual antes da correção — deve aparecer o marco espúrio
--    (id 66908401-5ae8-4e40-ae90-36c26c683364, 2026-07-17→2026-07-22) e o
--    "Cadastro inicial" (id d2bf67b7-40ae-4c73-bea3-a0e14f013cb1, 2026-06-01→2026-06-01).
SELECT id, effective_from, effective_until, tipo_contratacao, cargo, salario_mensal,
       created_at
FROM public.employee_versions
WHERE employee_id = '022b0a55-0263-48ef-ae9f-488d531c596d'
ORDER BY effective_from;

-- 2. Apaga só o marco espúrio — filtro por employee_id + id exato + as duas datas
--    reais, pra não atingir nenhuma outra linha por engano (se algo não bater
--    exatamente, apaga 0 linhas em vez de errar o alvo).
DELETE FROM public.employee_versions
WHERE employee_id = '022b0a55-0263-48ef-ae9f-488d531c596d'
  AND id = '66908401-5ae8-4e40-ae90-36c26c683364'
  AND effective_from = '2026-07-17'
  AND effective_until = '2026-07-22';

-- 3. Confere o resultado — só deve sobrar o "Cadastro inicial" (01/06→01/06, duração
--    zero, inofensivo).
SELECT id, effective_from, effective_until, tipo_contratacao, cargo, salario_mensal,
       created_at
FROM public.employee_versions
WHERE employee_id = '022b0a55-0263-48ef-ae9f-488d531c596d'
ORDER BY effective_from;

-- 4. Recálculo de custo de projeto: mesmo raciocínio do passo 5 de
--    fix-gabriel-employee-version-date.sql — só necessário SE o Adryan já tiver
--    alocação em algum projeto cobrindo o período 17-21/07/2026 (confira antes de
--    rodar). A Folha de Pagamento / Custo x Hora não precisa — leem employee_versions
--    direto em tempo de render.
