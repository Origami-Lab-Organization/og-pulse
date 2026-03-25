-- Adiciona campo de justificativa para movimentação de candidatos
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS justificativa_movimentacao text;

-- Migra candidatos com status 'reprovado' para 'descartado'
UPDATE public.job_applications SET status = 'descartado' WHERE status = 'reprovado';
