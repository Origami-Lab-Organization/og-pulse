-- Rollback de 20260910180000 (PUL-258): fecha a leitura entre tenants.
--
-- Depois disto, /uso responde erro e ninguem le uso de outro tenant. A capacidade sai do
-- papel; o vocabulario e a coluna ficam, porque apagar `capabilities` em cascata levaria
-- `role_capabilities` de outros tenants junto e a coluna e inofensiva sem a funcao.

DROP FUNCTION IF EXISTS public.platform_tenant_usage();

DELETE FROM public.role_capabilities WHERE capability = 'plataforma:ler-uso';

-- A coluna e o indice ficam: sem a funcao, `is_platform_owner` nao da acesso a nada.
-- Para remover de vez:
--   DROP INDEX IF EXISTS public.tenants_single_platform_owner;
--   ALTER TABLE public.tenants DROP COLUMN IF EXISTS is_platform_owner;
--   DELETE FROM public.capabilities WHERE key = 'plataforma:ler-uso';
