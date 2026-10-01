-- Limpeza pedida pelo Italo em 01/10/2026 ("limpe as parcelas"): parcelas de R$ 0 marcadas como
-- recebidas na Origami.
--
-- 28 parcelas em três projetos concluídos (Moneteen 14, LaudoAssist 8, Origami CRM 6), com
-- vencimento até 2029, nenhuma com comissão. Nasceram do gerador de parcelas (valor zero, ou valor
-- já todo distribuído) e foram marcadas recebidas para destravar a conclusão antes da ADR-0038. Não
-- carregam dinheiro, mas contam como parcela recebida. O gerador foi corrigido no PR #58.
--
-- Escopo estreito de propósito: só o tenant ligado ao Conta Azul (a Origami — conferido em
-- 01/10/2026 que é o mesmo tenant com mais funcionários), só valor 0, só recebidas, só sem
-- comissão. A parcela zerada pendente de outro cliente fica.
--
-- Cópia fiel antes de apagar, em schema fora da API (mesmo padrão de legado_oportunidades).
-- Rollback: supabase/rollback/20261001170000_limpa_parcelas_zeradas_origami_rollback.sql

CREATE SCHEMA IF NOT EXISTS legado_limpezas;
REVOKE ALL ON SCHEMA legado_limpezas FROM PUBLIC;

CREATE TABLE legado_limpezas.parcelas_zeradas_20261001 AS
SELECT i.*
  FROM public.project_installments i
  JOIN public.projects p ON p.id = i.project_id
 WHERE p.tenant_id = (
         SELECT t.id FROM public.tenants t
          WHERE t.name ILIKE '%origami%'
          ORDER BY (SELECT count(*) FROM public.employees e WHERE e.tenant_id = t.id) DESC, t.created_at
          LIMIT 1
       )
   AND i.value = 0
   AND i.status = 'received'
   AND NOT EXISTS (SELECT 1 FROM public.project_commissions c WHERE c.installment_id = i.id);

REVOKE ALL ON legado_limpezas.parcelas_zeradas_20261001 FROM PUBLIC;

COMMENT ON TABLE legado_limpezas.parcelas_zeradas_20261001 IS
  'Cópia fiel das parcelas de R$ 0 recebidas apagadas da Origami em 01/10/2026 (migration 20261001170000).';

DELETE FROM public.project_installments i
 USING legado_limpezas.parcelas_zeradas_20261001 b
 WHERE i.id = b.id;
