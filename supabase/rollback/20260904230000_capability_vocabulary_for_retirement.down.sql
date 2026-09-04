-- Rollback do vocabulário da aposentadoria. Só aplicável depois de reverter a virada das
-- policies, senão a foreign key de role_capabilities recusa e as policies citam capacidade
-- inexistente.
DELETE FROM public.role_capabilities WHERE capability IN ('estrategia:editar','ferias:administrar','lancamento:desfazer','alocacao:ler-tudo');
DELETE FROM public.user_capability_overrides WHERE capability IN ('estrategia:editar','ferias:administrar','lancamento:desfazer','alocacao:ler-tudo');
DELETE FROM public.capabilities WHERE key IN ('estrategia:editar','ferias:administrar','lancamento:desfazer','alocacao:ler-tudo');
