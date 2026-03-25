-- Atualiza o valor padrão do status de 'novo' para 'triagem'
ALTER TABLE public.job_applications
  ALTER COLUMN status SET DEFAULT 'triagem';

-- Migra registros existentes com status antigos para os novos valores
UPDATE public.job_applications SET status = 'triagem'   WHERE status = 'novo';
UPDATE public.job_applications SET status = 'entrevista' WHERE status = 'em_analise';
