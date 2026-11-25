-- Rollback de 20261125119000_linha_de_servico_tem_icone.sql

ALTER TABLE public.service_lines DROP CONSTRAINT IF EXISTS service_lines_icone_check;
ALTER TABLE public.service_lines DROP COLUMN IF EXISTS icone;
