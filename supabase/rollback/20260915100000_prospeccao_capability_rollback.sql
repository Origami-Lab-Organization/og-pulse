-- Reversão de 20260915100000_prospeccao_capability.sql.
--
-- Só é segura depois de revertidas as migrations das tabelas (20260915110000 a
-- 20260915130000), cujas policies referenciam estas chaves.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DELETE FROM public.user_capability_overrides
  WHERE capability IN ('prospeccao:ler', 'prospeccao:editar');
DELETE FROM public.default_role_capabilities
  WHERE capability IN ('prospeccao:ler', 'prospeccao:editar');
DELETE FROM public.role_capabilities
  WHERE capability IN ('prospeccao:ler', 'prospeccao:editar');
DELETE FROM public.capabilities
  WHERE key IN ('prospeccao:ler', 'prospeccao:editar');
