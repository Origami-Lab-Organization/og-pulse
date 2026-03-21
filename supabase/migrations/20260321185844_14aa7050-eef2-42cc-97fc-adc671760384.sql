-- Materials catalog table
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'outros',
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  sku text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT materials_category_check CHECK (category IN ('equipamento','material_escritorio','infraestrutura','insumos','outros')),
  CONSTRAINT materials_unit_check CHECK (unit IN ('un','pc','cx','pct','m','m2','kg','L','hr')),
  CONSTRAINT materials_status_check CHECK (status IN ('active','inactive'))
);

CREATE INDEX IF NOT EXISTS idx_materials_tenant_status ON public.materials (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_materials_tenant_category ON public.materials (tenant_id, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_tenant_sku ON public.materials (tenant_id, sku) WHERE sku IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_materials_updated_at') THEN
    CREATE TRIGGER update_materials_updated_at
      BEFORE UPDATE ON public.materials
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view materials in their tenant" ON public.materials;
CREATE POLICY "Users can view materials in their tenant"
  ON public.materials FOR SELECT
  USING (user_belongs_to_tenant(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can insert materials" ON public.materials;
CREATE POLICY "Admins and managers can insert materials"
  ON public.materials FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can update materials" ON public.materials;
CREATE POLICY "Admins and managers can update materials"
  ON public.materials FOR UPDATE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "Admins and managers can delete materials" ON public.materials;
CREATE POLICY "Admins and managers can delete materials"
  ON public.materials FOR DELETE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

ALTER TABLE public.budget_materials
  ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;

ALTER TABLE public.project_materials
  ADD COLUMN IF NOT EXISTS material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL;