-- Rollback de 20261124100000_bant_para_qualificar.sql: tira a regra do banco. A tela e o MCP
-- continuam exigindo a nota comprovada (src/lib/prospecting/bant.ts).

DROP TRIGGER IF EXISTS prospects_exige_bant_para_qualificar ON public.prospects;
DROP FUNCTION IF EXISTS public.prospects_exige_bant_para_qualificar();
