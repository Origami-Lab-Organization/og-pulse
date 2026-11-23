-- Prospecção — só o BANT comprovado qualifica a oportunidade (US-0038, 23/11/2026).
--
-- A US-0022 exige nota 75 e nenhum "Não atende" para entrar em "Oportunidade qualificada", mas
-- só a tela e o MCP conferiam. Decisão do Victor: para essa entrada, contam só as evidências
-- aceitas (registradas pela pessoa, ou propostas pela IA e aceitas); os indícios automáticos do
-- Pulse ficam como pista. Assim a regra cabe no banco, com a mesma conta da tela e do MCP
-- (`oQueFaltaParaQualificar` em src/lib/prospecting/bant.ts):
--
--   * cada letra vale a evidência aceita mais recente: confirmado 2, indício 1, "não sei" e
--     "não atende" 0;
--   * precisa de 6 de 8 pontos (nota 75) e de nenhuma letra em "não atende";
--   * voltar de Ganho ou Perda para "Oportunidade qualificada" é correção e não passa pela regra,
--     como na tela.
--
-- Rollback: supabase/rollback/20261124100000_bant_para_qualificar_rollback.sql

-- SECURITY DEFINER: conta todas as evidências da oportunidade, qualquer que seja a RLS de quem
-- move; a oportunidade já passou pela RLS de UPDATE (ADR-0021).
CREATE OR REPLACE FUNCTION public.prospects_exige_bant_para_qualificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pontos integer;
  v_contra text;
BEGIN
  WITH ultima AS (
    SELECT DISTINCT ON (e.letra) e.letra, e.estado
      FROM public.prospect_bant_evidencias e
     WHERE e.prospect_id = NEW.id AND e.situacao = 'aceita'
     ORDER BY e.letra, coalesce(e.decidida_em, e.created_at) DESC
  )
  SELECT coalesce(sum(CASE estado WHEN 'confirmado' THEN 2 WHEN 'indicio' THEN 1 ELSE 0 END), 0)::integer,
         string_agg(letra, ', ' ORDER BY position(letra IN 'BANT')) FILTER (WHERE estado = 'nao_atende')
    INTO v_pontos, v_contra
    FROM ultima;

  IF v_contra IS NOT NULL THEN
    RAISE EXCEPTION '% marcado como "Não atende". Revise antes de qualificar, ou registre a Perda.', v_contra
      USING ERRCODE = 'PU001';
  END IF;
  IF v_pontos < 6 THEN
    RAISE EXCEPTION 'Nota comprovada %: para qualificar, 75 só com evidências aceitas — os indícios do Pulse não contam.',
      round(v_pontos * 100.0 / 8)
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prospects_exige_bant_para_qualificar() FROM PUBLIC;

DROP TRIGGER IF EXISTS prospects_exige_bant_para_qualificar ON public.prospects;
CREATE TRIGGER prospects_exige_bant_para_qualificar
  BEFORE UPDATE OF stage ON public.prospects
  FOR EACH ROW
  WHEN (NEW.stage = 'qualificado'
    AND OLD.stage IS DISTINCT FROM 'qualificado'
    AND OLD.stage NOT IN ('ganho', 'descartado', 'sem_resposta', 'convertido'))
  EXECUTE FUNCTION public.prospects_exige_bant_para_qualificar();
