
CREATE OR REPLACE FUNCTION public.get_crm_received_value(p_tenant_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(pi.value), 0)
  FROM project_installments pi
  JOIN projects p ON pi.project_id = p.id
  JOIN leads l ON p.budget_id = l.budget_id
  WHERE l.tenant_id = p_tenant_id
    AND l.crm_stage = 'closed'
    AND pi.status = 'received'
    AND EXTRACT(YEAR FROM pi.payment_date) = EXTRACT(YEAR FROM NOW())
$$;
