
-- Add approval workflow columns to project_commissions
ALTER TABLE public.project_commissions
  ADD COLUMN approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN requested_by uuid REFERENCES public.employees(id),
  ADD COLUMN approved_by uuid REFERENCES public.employees(id),
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN rejection_reason text;

-- Make installment_id nullable for manual commissions
ALTER TABLE public.project_commissions
  ALTER COLUMN installment_id DROP NOT NULL;
