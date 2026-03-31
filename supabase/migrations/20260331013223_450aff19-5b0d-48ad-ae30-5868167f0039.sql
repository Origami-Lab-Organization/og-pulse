
-- Criar tabela auxiliar para sessões bloqueadas
CREATE TABLE IF NOT EXISTS public.blocked_users (
  auth_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can check own blocked status"
ON public.blocked_users FOR SELECT
USING (auth_id = auth.uid());

-- Função trigger para invalidar sessões
CREATE OR REPLACE FUNCTION public.handle_employee_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('bloqueado', 'arquivado') AND OLD.status NOT IN ('bloqueado', 'arquivado') THEN
    INSERT INTO public.blocked_users (auth_id, blocked_at)
    VALUES (NEW.auth_id, now())
    ON CONFLICT (auth_id) DO UPDATE SET blocked_at = now();
  END IF;

  IF NEW.status NOT IN ('bloqueado', 'arquivado') AND OLD.status IN ('bloqueado', 'arquivado') THEN
    DELETE FROM public.blocked_users WHERE auth_id = NEW.auth_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger na tabela employees
DROP TRIGGER IF EXISTS on_employee_status_change ON public.employees;
CREATE TRIGGER on_employee_status_change
  AFTER UPDATE OF status ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_employee_status_change();
