
-- Create market_analyses table for persisting generated analyses
CREATE TABLE public.market_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES public.employees(id),
  module VARCHAR(20) NOT NULL,
  module_label VARCHAR(255) NOT NULL,
  form_data JSONB NOT NULL,
  result_markdown TEXT NOT NULL,
  chat_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own analyses within their tenant
CREATE POLICY "Users can view own analyses"
ON public.market_analyses FOR SELECT
USING (
  user_id IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
  AND user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- Users can insert their own analyses
CREATE POLICY "Users can insert own analyses"
ON public.market_analyses FOR INSERT
WITH CHECK (
  user_id IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
  AND user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- Users can update their own analyses
CREATE POLICY "Users can update own analyses"
ON public.market_analyses FOR UPDATE
USING (
  user_id IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
  AND user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- Users can delete their own analyses
CREATE POLICY "Users can delete own analyses"
ON public.market_analyses FOR DELETE
USING (
  user_id IN (SELECT id FROM public.employees WHERE auth_id = auth.uid())
  AND user_belongs_to_tenant(auth.uid(), tenant_id)
);

-- Trigger for updated_at
CREATE TRIGGER update_market_analyses_updated_at
BEFORE UPDATE ON public.market_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
