-- Rollback: cliente novo volta a nascer sem perfil, e quem entrar nele fica sem acesso.
DROP TRIGGER IF EXISTS trg_seed_tenant_roles ON public.tenants;
DROP FUNCTION IF EXISTS public.seed_tenant_roles_on_insert();
DROP FUNCTION IF EXISTS public.seed_tenant_roles(uuid);
DROP TABLE IF EXISTS public.default_role_capabilities;
DROP TABLE IF EXISTS public.default_tenant_roles;
