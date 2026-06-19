-- Create tools catalog table
-- Catálogo corporativo de ferramentas por tenant.
-- Idêntico em estrutura ao catálogo de benefícios.

CREATE TABLE public.tools (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  value       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tools in their tenant"
ON public.tools FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins can insert tools"
ON public.tools FOR INSERT
WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can update tools"
ON public.tools FOR UPDATE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can delete tools"
ON public.tools FOR DELETE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE INDEX tools_tenant_id_idx ON public.tools(tenant_id);
