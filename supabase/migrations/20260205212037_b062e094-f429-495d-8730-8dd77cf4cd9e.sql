-- Add budget_supplier_id to link project suppliers to budget suppliers
ALTER TABLE public.project_suppliers 
ADD COLUMN budget_supplier_id uuid REFERENCES public.budget_suppliers(id);

-- Create index for performance
CREATE INDEX idx_project_suppliers_budget_supplier_id ON public.project_suppliers(budget_supplier_id);