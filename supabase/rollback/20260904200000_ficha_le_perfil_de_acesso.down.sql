-- Rollback: a ficha volta a não conseguir ler o perfil de quem não é a própria pessoa, e
-- passa a exibir "sem perfil" para quem não é admin.
DROP POLICY IF EXISTS "Quem le a ficha completa ve o perfil de acesso" ON public.user_tenant_roles;
