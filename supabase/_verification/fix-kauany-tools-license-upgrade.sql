-- Correção do histórico + cadastro atual de ferramentas da Kauany Sebastiana
-- Arantes (id a5ffeaa3-b63a-469c-a922-2062fecef584). NÃO é migration — rode
-- manualmente no SQL Editor do Supabase, na ordem abaixo. Complementa
-- fix-kauany-estagio-benefits.sql (mesma causa raiz: total_tools_cost NULL nas
-- versões Estágio faz o cálculo cair no total AO VIVO de employee_tools).
--
-- Diagnóstico (confirmado pelo usuário em 21/07):
--   - Kauany tem licença MS365 e Claude desde janeiro/2026 (nenhuma ferramenta
--     "nova" a versionar, ao contrário do que se cogitou inicialmente).
--   - A licença MS365 mudou de F1 (R$15,75) para Standard (R$97,80) por volta
--     da troca de contrato Estagiária -> CLT (24/04/2026) — data aproximada,
--     de memória do usuário, não confirmada em fatura/admin center.
--   - O cadastro ATUAL (employee_tools) ainda mostra MS365 = R$15,75 (F1) —
--     ou seja, está DESATUALIZADO desde a suposta troca em 24/04: todo custo
--     corrente calculado dela (Custo x Hora, snapshots de projeto, Folha do
--     mês atual) está subestimando a ferramenta em R$82,05/mês até hoje.
--   - Combinado com o bug já conhecido (total_tools_cost NULL nas 3 versões
--     Estágio cai no fallback ao vivo), os dois problemas hoje se cancelam
--     parcialmente por coincidência: o "ao vivo" ainda em F1 (151,75 =
--     Claude 136 + MS365 15,75) é, por acaso, o valor CORRETO do período
--     Estágio. Corrigir só o cadastro atual (passo 3) SEM congelar o
--     histórico (passo 2) INVERTERIA o bug — passaria a usar 233,80 (Claude
--     136 + MS365 Standard 97,80) também para os meses em que ela era
--     Estagiária. Por isso os dois passos abaixo devem ser aplicados juntos.
--
-- Fora de escopo: a data exata da troca de licença (assumida 24/04, mesma
-- data da troca de contrato, por não haver confirmação em fatura) — se depois
-- for encontrada uma data diferente, ajuste com um novo marco financeiro.

-- 1. Confere o estado atual antes da correção.
SELECT id, effective_from, effective_until, tipo_contratacao, total_tools_cost
FROM public.employee_versions
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
ORDER BY effective_from, created_at;

SELECT id, name, monthly_cost, is_active
FROM public.employee_tools
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584';

-- 2. Congela o valor correto de ferramentas do período Estágio (Claude 136 +
--    MS365 F1 15,75 = 151,75) nas 3 versões ESTAGIO — mesmos 3 ids do fix de
--    benefícios, targeting por id exato.
UPDATE public.employee_versions
SET total_tools_cost = 151.75
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND id IN (
    'afade50d-324f-46cc-a6b1-a90b2f53cc62',
    'aae68df4-ad09-41da-bf6c-089d304dd554',
    '54ee31cb-2396-4d99-ac61-4cd26f0023ac'
  );

-- 3. Corrige o cadastro ATUAL: MS365 de F1 (15,75) para Standard (97,80).
--    Rode a SELECT de confirmação abaixo ANTES do UPDATE e confira que
--    retorna exatamente 1 linha — se retornar mais de uma ou nenhuma, PARE e
--    ajuste o WHERE (não rode o UPDATE às cegas).
SELECT id, name, monthly_cost
FROM public.employee_tools
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND name = 'MS365';

UPDATE public.employee_tools
SET monthly_cost = 97.80
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
  AND name = 'MS365';

-- 4. Confere o resultado final.
SELECT id, effective_from, effective_until, tipo_contratacao, total_tools_cost
FROM public.employee_versions
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584'
ORDER BY effective_from, created_at;

SELECT id, name, monthly_cost, is_active
FROM public.employee_tools
WHERE employee_id = 'a5ffeaa3-b63a-469c-a922-2062fecef584';
