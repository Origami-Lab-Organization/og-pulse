-- Prospecção — Ganho e Perda (28/09/2026).
--
-- Pedido de 28/09/2026 (Guilherme): a Prospecção passa a ser o quadro comercial de ponta a
-- ponta, e o Pipeline de Oportunidades (/pipeline) vai deixar de existir — nada aqui se
-- conecta a `leads`. O contato sai do quadro de dois jeitos só:
--
--   - GANHO: fechamos negócio, o cliente aceitou a proposta. Nova etapa `ganho`, com a data
--     (`won_on`) e o valor vendido (`won_value`). O valor pode ficar para depois — o card
--     sinaliza —, a data não. Só de Reunião feita em diante: venda sem reunião não existe;
--   - PERDA: a etapa `descartado` de sempre, com novo rótulo na interface (como
--     `qualificado`, que só mudou de nome). Motivo obrigatório de uma lista fechada, que
--     cobre as duas perdas do comercial — o contato que não responde e a proposta recusada.
--
-- NENHUM DESFECHO É AUTOMÁTICO (28/09/2026, Guilherme): quem decide Ganho ou Perda é a
-- pessoa. A cadência esgotada deixa de encerrar o contato em "Sem resposta": ele fica em
-- "Em cadência", sem próxima data, até alguém registrar a perda (motivo "Sem resposta /
-- sem contato") ou um novo toque.
--
-- As regras moram no banco (trigger `prospects_outcome_rules`), não na tela: o MCP e
-- qualquer cliente passam por elas. `sem_resposta` e `convertido` continuam no CHECK só
-- para linhas antigas; nada novo chega nelas.
--
-- Rollback: supabase/rollback/20260928200000_prospect_ganho_perda_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Motivos de perda — lista fechada nova, com os antigos remapeados
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_discard_reason_valid;

UPDATE public.prospects
   SET discard_reason = CASE discard_reason
                          WHEN 'concorrente_incumbente' THEN 'concorrente'
                          WHEN 'contato_errado' THEN 'contato_invalido'
                          WHEN 'dados_invalidos' THEN 'contato_invalido'
                          ELSE discard_reason
                        END
 WHERE discard_reason IN ('concorrente_incumbente', 'contato_errado', 'dados_invalidos');

UPDATE public.prospect_stage_changes
   SET discard_reason = CASE discard_reason
                          WHEN 'concorrente_incumbente' THEN 'concorrente'
                          WHEN 'contato_errado' THEN 'contato_invalido'
                          WHEN 'dados_invalidos' THEN 'contato_invalido'
                          ELSE discard_reason
                        END
 WHERE discard_reason IN ('concorrente_incumbente', 'contato_errado', 'dados_invalidos');

-- Lista fechada, nunca texto livre: motivo digitado à mão não vira métrica.
ALTER TABLE public.prospects ADD CONSTRAINT prospects_discard_reason_valid CHECK (
  discard_reason IS NULL OR discard_reason IN (
    'sem_resposta', 'proposta_preco', 'proposta_escopo', 'concorrente', 'sem_orcamento',
    'momento_errado', 'sem_fit', 'sem_interesse', 'contato_invalido', 'pediu_para_parar'
  )
);

-- ---------------------------------------------------------------------------
-- 2. Ganho — etapa, data e valor
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;

ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (stage IN (
  'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado',
  'ganho', 'descartado',
  'sem_resposta', 'convertido'
));

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS won_on date,
  ADD COLUMN IF NOT EXISTS won_value numeric(14, 2);

ALTER TABLE public.prospects
  ADD CONSTRAINT prospects_won_value_valid CHECK (won_value IS NULL OR won_value >= 0),
  -- Ganho sem data não entra em período nenhum das métricas.
  ADD CONSTRAINT prospects_won_has_date CHECK (stage <> 'ganho' OR won_on IS NOT NULL);

COMMENT ON COLUMN public.prospects.won_on IS
  'Dia em que fechamos negócio. Preenchido só em Ganho; sai quando o contato deixa a etapa.';
COMMENT ON COLUMN public.prospects.won_value IS
  'Valor vendido. Opcional no registro do ganho — NULL em Ganho é o "Sem valor" do card.';
COMMENT ON COLUMN public.prospects.stage IS
  'Etapa do quadro comercial. Seis etapas de trabalho (a_abordar, em_cadencia, respondeu, '
  'reuniao_agendada, reuniao_feita, qualificado) e dois desfechos, sempre decididos pela '
  'pessoa: ganho e descartado (Perda na interface). sem_resposta e convertido não recebem '
  'mais ninguém.';

-- ---------------------------------------------------------------------------
-- 3. Regras de desfecho
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospects_outcome_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    RETURN NEW;
  END IF;

  IF NEW.stage = 'ganho' AND OLD.stage NOT IN ('reuniao_feita', 'qualificado') THEN
    RAISE EXCEPTION 'Ganho só a partir de Reunião feita ou Oportunidade qualificada.'
      USING ERRCODE = 'PU001';
  END IF;

  -- Saindo de um desfecho, o anterior não pode ficar grudado no contato.
  IF OLD.stage = 'ganho' THEN
    NEW.won_on := NULL;
    NEW.won_value := NULL;
  END IF;
  IF OLD.stage = 'descartado' AND NEW.stage <> 'descartado' THEN
    NEW.discard_reason := NULL;
    NEW.discarded_at := NULL;
  END IF;

  IF NEW.stage = 'ganho' THEN
    NEW.won_on := COALESCE(NEW.won_on, hoje);
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.next_activity_on := NULL;
  ELSIF NEW.stage = 'descartado' THEN
    NEW.discarded_at := COALESCE(NEW.discarded_at, now());
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    NEW.next_activity_on := NULL;
  ELSIF OLD.stage IN ('ganho', 'descartado') THEN
    -- De volta ao trabalho: sem desfecho e com atividade para hoje, como Reabrir.
    NEW.closed_at := NULL;
    NEW.next_activity_on := COALESCE(NEW.next_activity_on, hoje);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospects_outcome_rules() IS
  'Ganho só de Reunião feita em diante; entrar em Ganho/Perda carimba a data e fecha o card; '
  'sair limpa o desfecho. Fonte ÚNICA dessas regras — a tela só abre o diálogo.';

DROP TRIGGER IF EXISTS prospects_outcome_rules ON public.prospects;
CREATE TRIGGER prospects_outcome_rules
  BEFORE UPDATE OF stage ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.prospects_outcome_rules();

-- ---------------------------------------------------------------------------
-- 4. Cadência esgotada não encerra mais o contato
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospect_activities_advance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  cadencia CONSTANT integer[] := ARRAY[3, 4, 5];
  pai      record;
  etapa    text;
  proxima  date;
BEGIN
  SELECT stage, next_activity_on
    INTO pai
    FROM public.prospects
   WHERE id = NEW.prospect_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;

  etapa := pai.stage;

  IF pai.stage IN ('a_abordar', 'em_cadencia') THEN
    IF NEW.got_response THEN
      -- Só evento verificável move o card: resposta registrada, não e-mail aberto.
      etapa   := 'respondeu';
      proxima := NULL;
    ELSE
      -- Cadência esgotada: continua em cadência, sem próxima data. Perda é decisão da pessoa.
      etapa   := 'em_cadencia';
      proxima := CASE
                   WHEN NEW.sequence_no <= array_length(cadencia, 1)
                     THEN NEW.activity_date + cadencia[NEW.sequence_no]
                 END;
    END IF;
  ELSE
    -- Etapas conduzidas à mão: a atividade consome a data vencida e preserva agendamento futuro.
    proxima := CASE
                 WHEN pai.next_activity_on > NEW.activity_date THEN pai.next_activity_on
                 ELSE NULL
               END;
  END IF;

  UPDATE public.prospects
     SET activity_count   = NEW.sequence_no,
         stage            = etapa,
         next_activity_on = proxima,
         first_touch_at   = COALESCE(first_touch_at, NEW.activity_date)
   WHERE id = NEW.prospect_id;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.prospect_activities_advance() IS
  'Conta o toque e agenda o próximo pela cadência ARRAY[3,4,5]. Esgotada a sequência, o '
  'contato continua em cadência sem próxima data — desde 28/09/2026 nenhum desfecho é '
  'automático. Fonte ÚNICA da regra de cadência — não replicar no cliente.';

-- As linhas antigas em "Sem resposta" (desfecho automático) voltam para "Em cadência", onde
-- a pessoa decide. O trigger de histórico fica desligado: é correção de regra, não um
-- movimento do contato, e o evento antigo continua no histórico como aconteceu.
ALTER TABLE public.prospects DISABLE TRIGGER prospect_stage_changes_on_update;
ALTER TABLE public.prospects DISABLE TRIGGER prospects_outcome_rules;

UPDATE public.prospects
   SET stage = 'em_cadencia',
       closed_at = NULL,
       next_activity_on = NULL
 WHERE stage = 'sem_resposta';

ALTER TABLE public.prospects ENABLE TRIGGER prospects_outcome_rules;
ALTER TABLE public.prospects ENABLE TRIGGER prospect_stage_changes_on_update;

-- ---------------------------------------------------------------------------
-- 5. Registrar o ganho
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER: o UPDATE passa pela RLS de prospects (prospeccao:editar) e pelas regras
-- do trigger acima. Serve também para corrigir data e valor de quem já está em Ganho.
CREATE OR REPLACE FUNCTION public.mark_prospect_won(
  p_prospect_id uuid,
  p_won_on date,
  p_value numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_won_on IS NULL THEN
    RAISE EXCEPTION 'Informe a data do ganho.' USING ERRCODE = 'PU001';
  END IF;
  IF p_won_on > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'A data do ganho não pode ser futura.' USING ERRCODE = 'PU001';
  END IF;
  IF p_value < 0 THEN
    RAISE EXCEPTION 'O valor do ganho não pode ser negativo.' USING ERRCODE = 'PU001';
  END IF;

  -- O histórico de etapa data a mudança pelo dia do fechamento (ver prospect_stage_changes_record).
  PERFORM set_config('prospeccao.data_da_etapa', p_won_on::text, true);

  UPDATE public.prospects
     SET stage = 'ganho', won_on = p_won_on, won_value = p_value
   WHERE id = p_prospect_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.mark_prospect_won(uuid, date, numeric) IS
  'Marca o contato como Ganho na data informada, com valor opcional. Roda como quem chama.';

REVOKE ALL ON FUNCTION public.mark_prospect_won(uuid, date, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_prospect_won(uuid, date, numeric) TO authenticated;
