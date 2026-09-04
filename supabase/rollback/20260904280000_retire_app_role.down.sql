-- Rollback do passo 4 (PUL-206): recria o mecanismo antigo VAZIO.
--
-- Atenção, e é o motivo de este passo vir por último: o rollback recria a estrutura, não o
-- CONTEÚDO. `user_roles` volta sem linha nenhuma, porque a tabela foi derrubada. Repovoar
-- exige derivar do perfil de cada pessoa — o inverso do espelhamento original:
--
--   INSERT INTO public.user_roles (user_id, tenant_id, role)
--   SELECT utr.user_id, utr.tenant_id,
--          CASE WHEN public.has_capability(utr.user_id, utr.tenant_id, 'pessoa:editar-papel')
--               THEN 'admin'::app_role
--               WHEN public.has_capability(utr.user_id, utr.tenant_id, 'projeto:editar')
--               THEN 'manager'::app_role ELSE 'user'::app_role END
--   FROM public.user_tenant_roles utr;
--
-- Reverter de verdade significa também reverter 250000 e 240000, nesta ordem inversa.
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'rh', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _tenant_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id=_user_id AND ur.tenant_id=_tenant_id AND ur.role=_role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id=_user_id AND ur.tenant_id=_tenant_id
                   AND ur.role IN ('admin'::public.app_role,'manager'::public.app_role))
$$;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'pessoa:editar-papel'));
