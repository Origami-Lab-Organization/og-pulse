-- TD-0016 — `strategy_guardrails.tenant_id` era a única coluna de isolamento de tenant do
-- domínio de estratégia SEM foreign key para `tenants`. As cinco irmãs
-- (`strategy_cycles`, `strategy_objectives`, `strategy_key_results`,
-- `strategy_initiatives`, `strategy_checkins`) todas têm, com `ON DELETE CASCADE`.
--
-- Origem do defeito: dos dois trilhos de migration sobrepostos (TD-0014), o que foi
-- aplicado em produção (20260428124325) era o sem FK. Omissão, não decisão.
--
-- Consequência de não ter: nada impedia guardrail apontando para tenant inexistente, e a
-- linha ficaria inacessível para todo mundo (a policy resolve
-- `has_capability(uid, tenant_id, ...)` como falso) — lixo invisível que ninguém
-- diagnostica. Verificado antes de aplicar, em 2026-09-04: 3 linhas, nenhum órfão,
-- nenhum `tenant_id` nulo. A coluna já era `NOT NULL`; faltava só a integridade
-- referencial.
--
-- `NOT VALID` seria a escolha para tabela grande, para não travar leitura durante a
-- validação. Com 3 linhas, valida na hora — e FK `NOT VALID` esquecida é dívida nova.

ALTER TABLE public.strategy_guardrails
  ADD CONSTRAINT strategy_guardrails_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
