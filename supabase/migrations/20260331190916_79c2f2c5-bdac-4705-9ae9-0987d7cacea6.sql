
ALTER TABLE public.projects
ADD COLUMN cancellation_reason TEXT,
ADD COLUMN cancellation_notes TEXT,
ADD COLUMN cancelled_at TIMESTAMPTZ,
ADD COLUMN cancelled_by UUID;
