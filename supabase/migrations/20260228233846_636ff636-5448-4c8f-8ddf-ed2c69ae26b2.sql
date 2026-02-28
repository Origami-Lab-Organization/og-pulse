-- Add column to link corrected reimbursements to their rejected originals
ALTER TABLE public.reimbursement_requests 
ADD COLUMN corrected_from_id uuid REFERENCES public.reimbursement_requests(id) ON DELETE SET NULL;

-- Index for quick lookups
CREATE INDEX idx_reimbursement_requests_corrected_from ON public.reimbursement_requests(corrected_from_id) WHERE corrected_from_id IS NOT NULL;