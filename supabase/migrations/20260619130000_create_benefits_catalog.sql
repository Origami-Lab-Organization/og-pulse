-- Create benefits catalog table
-- Catálogo corporativo de benefícios por tenant.
-- Diferente de employee_benefits (vínculos por funcionário), esta tabela
-- armazena as opções disponíveis que o admin pode configurar.

CREATE TABLE public.benefits (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  value       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view benefits in their tenant"
ON public.benefits FOR SELECT
USING (user_belongs_to_tenant(auth.uid(), tenant_id));

CREATE POLICY "Admins can insert benefits"
ON public.benefits FOR INSERT
WITH CHECK (has_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can update benefits"
ON public.benefits FOR UPDATE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Admins can delete benefits"
ON public.benefits FOR DELETE
USING (has_role(auth.uid(), tenant_id, 'admin'::app_role));

-- Índice para queries por tenant
CREATE INDEX benefits_tenant_id_idx ON public.benefits(tenant_id);
