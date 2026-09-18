-- Reversão de 20260917190000_prospect_lever_closed_list.sql.
--
-- Devolve os slugs aos rótulos, para o campo voltar a fazer sentido como texto livre.
-- "Rede Origami" NÃO volta a ser "Rede do Sócio": a renomeação foi decisão de negócio, não
-- efeito colateral desta migration.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_lever_valid;

UPDATE public.prospects SET lever = CASE lever
    WHEN 'rede_origami'        THEN 'Rede Origami'
    WHEN 'outbound'            THEN 'Outbound'
    WHEN 'inbound'             THEN 'Inbound'
    WHEN 'abm'                 THEN 'ABM'
    WHEN 'indicacao_parceiros' THEN 'Indicação de Parceiros'
    WHEN 'recomendacao'        THEN 'Recomendação'
    WHEN 'feira'               THEN 'Feira'
    WHEN 'sindicato'           THEN 'Sindicato'
    WHEN 'expansao'            THEN 'Expansão'
    ELSE lever
  END
WHERE lever IS NOT NULL;
