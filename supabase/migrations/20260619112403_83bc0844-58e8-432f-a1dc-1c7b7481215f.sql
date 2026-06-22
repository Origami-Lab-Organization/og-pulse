
-- 1. Fix job_applications INSERT: bind tenant_id to job opening
DROP POLICY IF EXISTS "Anyone can submit a job application" ON public.job_applications;
CREATE POLICY "Anyone can submit a job application"
  ON public.job_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_openings jo
      WHERE jo.id = job_applications.vaga_id
        AND jo.tenant_id = job_applications.tenant_id
        AND jo.status = 'aberta'
    )
  );

-- 2. reimbursement_items: add UPDATE/DELETE policies (own pending only)
DROP POLICY IF EXISTS "Users can update items of their own pending reimbursements" ON public.reimbursement_items;
CREATE POLICY "Users can update items of their own pending reimbursements"
  ON public.reimbursement_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_items.reimbursement_id
        AND rr.status = 'pending'
        AND rr.requested_by IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_items.reimbursement_id
        AND rr.status = 'pending'
        AND rr.requested_by IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete items of their own pending reimbursements" ON public.reimbursement_items;
CREATE POLICY "Users can delete items of their own pending reimbursements"
  ON public.reimbursement_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_items.reimbursement_id
        AND rr.status = 'pending'
        AND rr.requested_by IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
    )
  );

-- 3. Restrict SELECT on sensitive employee subtables to admins/managers
DROP POLICY IF EXISTS "Users can view employee versions in their tenant" ON public.employee_versions;
CREATE POLICY "Admins and managers can view employee versions"
  ON public.employee_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_versions.employee_id
        AND (
          public.has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
          OR public.has_role(auth.uid(), e.tenant_id, 'manager'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Users can view benefits for employees in their tenant" ON public.employee_benefits;
CREATE POLICY "Admins and managers can view employee benefits"
  ON public.employee_benefits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_benefits.employee_id
        AND (
          public.has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
          OR public.has_role(auth.uid(), e.tenant_id, 'manager'::app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Users can view tools for employees in their tenant" ON public.employee_tools;
CREATE POLICY "Admins and managers can view employee tools"
  ON public.employee_tools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_tools.employee_id
        AND (
          public.has_role(auth.uid(), e.tenant_id, 'admin'::app_role)
          OR public.has_role(auth.uid(), e.tenant_id, 'manager'::app_role)
        )
    )
  );

-- 4. Storage: contracts SELECT (tenant_id path prefix)
DROP POLICY IF EXISTS "Users can view contracts in their tenant" ON storage.objects;
CREATE POLICY "Users can view contracts in their tenant"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_id = auth.uid()
        AND (storage.foldername(name))[1] = e.tenant_id::text
    )
  );

-- 5. Storage: curriculos SELECT (admins/managers only)
DROP POLICY IF EXISTS "Authenticated users can read curriculos" ON storage.objects;
CREATE POLICY "Admins and managers can read curriculos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'curriculos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'manager'::app_role)
    )
  );

-- 6. Storage: company-logos write policies must enforce tenant path prefix
DROP POLICY IF EXISTS "Admins and managers can upload company logos" ON storage.objects;
CREATE POLICY "Admins and managers can upload company logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'manager'::app_role)
        AND ur.tenant_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update company logos" ON storage.objects;
CREATE POLICY "Admins and managers can update company logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'manager'::app_role)
        AND ur.tenant_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Admins and managers can delete company logos" ON storage.objects;
CREATE POLICY "Admins and managers can delete company logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'manager'::app_role)
        AND ur.tenant_id::text = (storage.foldername(name))[1]
    )
  );

-- 7. Storage: reimbursement-receipts tenant scoping + UPDATE/DELETE
DROP POLICY IF EXISTS "Users can view reimbursement receipts" ON storage.objects;
CREATE POLICY "Users can view reimbursement receipts in their tenant"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT e.tenant_id::text FROM public.employees e WHERE e.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can upload reimbursement receipts" ON storage.objects;
CREATE POLICY "Users can upload reimbursement receipts to their tenant"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reimbursement-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT e.tenant_id::text FROM public.employees e WHERE e.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update reimbursement receipts in their tenant" ON storage.objects;
CREATE POLICY "Users can update reimbursement receipts in their tenant"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT e.tenant_id::text FROM public.employees e WHERE e.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete reimbursement receipts in their tenant" ON storage.objects;
CREATE POLICY "Users can delete reimbursement receipts in their tenant"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT e.tenant_id::text FROM public.employees e WHERE e.auth_id = auth.uid()
    )
  );

-- 8. Public job opening RPC with salary masking; drop anon SELECT on raw table
DROP POLICY IF EXISTS "Anyone can view open job openings" ON public.job_openings;

CREATE OR REPLACE FUNCTION public.get_public_job_opening(p_vaga_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  titulo text,
  area text,
  regime_contratacao text,
  modalidade text,
  localizacao text,
  beneficios text,
  sobre_a_vaga text,
  senioridade text,
  responsabilidades text,
  requisitos_obrigatorios text,
  diferenciais text,
  sobre_empresa text,
  status text,
  public_url text,
  prazo_candidaturas date,
  nao_divulgar_salario boolean,
  salario_de numeric,
  salario_ate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    jo.id, jo.tenant_id, jo.titulo, jo.area, jo.regime_contratacao,
    jo.modalidade, jo.localizacao, jo.beneficios, jo.sobre_a_vaga,
    jo.senioridade, jo.responsabilidades, jo.requisitos_obrigatorios,
    jo.diferenciais, jo.sobre_empresa, jo.status, jo.public_url,
    jo.prazo_candidaturas, jo.nao_divulgar_salario,
    CASE WHEN jo.nao_divulgar_salario THEN NULL ELSE jo.salario_de END,
    CASE WHEN jo.nao_divulgar_salario THEN NULL ELSE jo.salario_ate END
  FROM public.job_openings jo
  WHERE jo.id = p_vaga_id AND jo.status = 'aberta';
$$;

GRANT EXECUTE ON FUNCTION public.get_public_job_opening(uuid) TO anon, authenticated;
