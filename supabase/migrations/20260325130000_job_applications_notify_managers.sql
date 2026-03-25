-- Trigger que notifica todos os gerentes/admins ativos do tenant
-- quando uma nova candidatura é recebida (funciona para formulário público e interno)

CREATE OR REPLACE FUNCTION public.notify_managers_new_job_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    tenant_id,
    recipient_id,
    type,
    category,
    priority,
    title,
    message,
    reference_id,
    action_url
  )
  SELECT
    NEW.tenant_id,
    e.id,
    'job_application_new',
    'candidatos',
    'normal',
    'Nova candidatura recebida',
    NEW.nome || ' se candidatou através do formulário público.',
    NEW.id,
    '/rh/candidatos'
  FROM public.employees e
  WHERE e.tenant_id = NEW.tenant_id
    AND e.status = 'ativo'
    AND (e.is_gerente = true OR e.system_role = 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_managers_new_job_application
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_managers_new_job_application();