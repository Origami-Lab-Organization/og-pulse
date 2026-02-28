
-- Create reimbursement_items table for individual expense lines
CREATE TABLE public.reimbursement_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reimbursement_id UUID NOT NULL REFERENCES public.reimbursement_requests(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reimbursement_items ENABLE ROW LEVEL SECURITY;

-- RLS policies: same access pattern as reimbursement_requests
CREATE POLICY "Users can view items of their reimbursements"
  ON public.reimbursement_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_id
      AND (rr.requested_by = auth.uid()::text::uuid
           OR EXISTS (
             SELECT 1 FROM public.employees e
             WHERE e.auth_id = auth.uid()
             AND e.tenant_id = rr.tenant_id
             AND (e.is_gerente = true OR e.system_role = 'admin')
           ))
    )
  );

CREATE POLICY "Users can insert items for their reimbursements"
  ON public.reimbursement_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reimbursement_requests rr
      WHERE rr.id = reimbursement_id
      AND rr.requested_by IN (
        SELECT e.id FROM public.employees e WHERE e.auth_id = auth.uid()
      )
    )
  );

-- Make description nullable on reimbursement_requests (will use items instead)
ALTER TABLE public.reimbursement_requests ALTER COLUMN description DROP NOT NULL;
ALTER TABLE public.reimbursement_requests ALTER COLUMN description SET DEFAULT '';

-- Index for faster lookups
CREATE INDEX idx_reimbursement_items_reimbursement_id ON public.reimbursement_items(reimbursement_id);
