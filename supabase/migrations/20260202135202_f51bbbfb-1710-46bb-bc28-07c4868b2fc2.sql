-- Atualizar constraint de status para incluir bloqueado e arquivado
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_status_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_status_check 
  CHECK (status IN ('ativo', 'inativo', 'aguardando_confirmacao', 'bloqueado', 'arquivado'));