
ALTER TABLE public.leads ADD COLUMN responsible_id uuid REFERENCES public.employees(id);
