
-- Table: reimbursement_requests
CREATE TABLE public.reimbursement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  requested_by uuid NOT NULL REFERENCES public.employees(id),
  project_id uuid REFERENCES public.projects(id),
  client_id uuid REFERENCES public.clients(id),
  is_internal boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.employees(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reimbursement_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: own requests OR admin/manager
CREATE POLICY "Users can view own reimbursements"
  ON public.reimbursement_requests FOR SELECT
  USING (
    requested_by IN (
      SELECT id FROM public.employees WHERE auth_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id
    )
    OR is_admin_or_manager(auth.uid(), tenant_id)
  );

-- INSERT: any employee in tenant
CREATE POLICY "Users can create reimbursements"
  ON public.reimbursement_requests FOR INSERT
  WITH CHECK (user_belongs_to_tenant(auth.uid(), tenant_id));

-- UPDATE: managers/admins
CREATE POLICY "Managers can update reimbursements"
  ON public.reimbursement_requests FOR UPDATE
  USING (is_admin_or_manager(auth.uid(), tenant_id));

-- DELETE: admins only
CREATE POLICY "Admins can delete reimbursements"
  ON public.reimbursement_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND tenant_id = reimbursement_requests.tenant_id AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_reimbursement_requests_updated_at
  BEFORE UPDATE ON public.reimbursement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table: reimbursement_attachments
CREATE TABLE public.reimbursement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reimbursement_id uuid NOT NULL REFERENCES public.reimbursement_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reimbursement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reimbursement attachments"
  ON public.reimbursement_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_attachments.reimbursement_id
        AND (
          rr.requested_by IN (SELECT id FROM public.employees WHERE auth_id = auth.uid() AND tenant_id = rr.tenant_id)
          OR is_admin_or_manager(auth.uid(), rr.tenant_id)
        )
    )
  );

CREATE POLICY "Users can insert reimbursement attachments"
  ON public.reimbursement_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_attachments.reimbursement_id
        AND user_belongs_to_tenant(auth.uid(), rr.tenant_id)
    )
  );

CREATE POLICY "Admins can delete reimbursement attachments"
  ON public.reimbursement_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_attachments.reimbursement_id
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND tenant_id = rr.tenant_id AND role = 'admin'
        )
    )
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('reimbursement-receipts', 'reimbursement-receipts', false);

-- Storage policies
CREATE POLICY "Authenticated users can upload reimbursement receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reimbursement-receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view reimbursement receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reimbursement-receipts' AND auth.role() = 'authenticated');
