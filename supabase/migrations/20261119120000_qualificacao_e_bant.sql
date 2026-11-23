-- Qualificação e BANT (19/11/2026, US-0022, US-0023, US-0024).
--
-- 1. Etapa nova `qualificacao`, antes de `a_abordar`: a empresa escolhida na base é estudada
--    (desk research, site, LinkedIn, Instagram, pessoas em comum) antes de virar abordagem.
-- 2. Atividade registrada na qualificação é pesquisa, não toque: não marca `first_touch_at` nem
--    mexe na etapa (o resto do gatilho de atividade fica igual).
-- 3. Evidências do BANT da oportunidade (`prospect_bant_evidencias`): cada letra (B, A, N, T)
--    tem a sua lista; o estado da letra é o da evidência aceita mais recente. A pessoa grava
--    evidência já aceita; a IA (pelo MCP, com a assinatura do Claude de quem usa) só propõe, e
--    a pessoa aceita ou recusa — a IA nunca decide (decisão de 19/11/2026).
--
-- Rollback: supabase/rollback/20261119120000_qualificacao_e_bant_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Etapa Qualificação
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (
  stage = ANY (ARRAY[
    'qualificacao', 'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada',
    'reuniao_feita', 'qualificado', 'ganho', 'descartado', 'sem_resposta'
  ])
);

-- ---------------------------------------------------------------------------
-- 2. Atividade na qualificação não é primeiro toque
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospect_activities_advance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
         -- Na qualificação a atividade é pesquisa: o primeiro toque fica para a abordagem.
         first_touch_at   = CASE WHEN pai.stage = 'qualificacao' THEN first_touch_at
                                 ELSE COALESCE(first_touch_at, NEW.activity_date) END
   WHERE id = NEW.prospect_id;

  RETURN NULL;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. Evidências do BANT
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.prospect_bant_evidencias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id  uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  letra        text NOT NULL CHECK (letra IN ('B', 'A', 'N', 'T')),
  estado       text NOT NULL CHECK (estado IN ('nao_sei', 'indicio', 'confirmado', 'nao_atende')),
  texto        text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 2000),
  fonte        text CHECK (fonte IS NULL OR char_length(fonte) <= 500),
  origem       text NOT NULL CHECK (origem IN ('pessoa', 'ia')),
  situacao     text NOT NULL DEFAULT 'aceita' CHECK (situacao IN ('proposta', 'aceita', 'recusada')),
  created_by   uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  decidida_por uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  decidida_em  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- "Confirmado" pede a fonte (ex.: "reunião de 20/11"): ninguém confirma para destravar etapa.
  CONSTRAINT prospect_bant_confirmado_com_fonte CHECK (estado <> 'confirmado' OR fonte IS NOT NULL),
  -- A IA só propõe; a pessoa grava já aceita.
  CONSTRAINT prospect_bant_ia_propoe CHECK (origem <> 'pessoa' OR situacao = 'aceita')
);

CREATE INDEX IF NOT EXISTS prospect_bant_evidencias_prospect_idx
  ON public.prospect_bant_evidencias (prospect_id, letra, created_at DESC);

COMMENT ON TABLE public.prospect_bant_evidencias IS
  'Evidências do BANT da oportunidade (US-0022): por letra, o estado, o texto, a fonte, a origem '
  '(pessoa ou IA) e a decisão. A IA só propõe; a pessoa aceita ou recusa (US-0024).';

-- Tenant herdado da oportunidade (ADR-0021); IA nasce proposta; só a decisão muda depois, e só
-- de uma proposta. Quem decide e quando vêm do servidor, não do cliente.
CREATE OR REPLACE FUNCTION public.prospect_bant_evidencias_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  oportunidade_tenant uuid;
  quem uuid;
BEGIN
  SELECT e.id INTO quem FROM public.employees e WHERE e.auth_id = auth.uid() LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    SELECT tenant_id INTO oportunidade_tenant FROM public.prospects WHERE id = NEW.prospect_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Oportunidade não encontrada.' USING ERRCODE = 'PU001';
    END IF;
    NEW.tenant_id := oportunidade_tenant;
    NEW.created_by := COALESCE(quem, NEW.created_by);
    NEW.created_at := now();
    IF NEW.origem = 'ia' THEN
      NEW.situacao := 'proposta';
      NEW.decidida_por := NULL;
      NEW.decidida_em := NULL;
    ELSE
      NEW.situacao := 'aceita';
      NEW.decidida_por := NEW.created_by;
      NEW.decidida_em := now();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: só aceitar ou recusar uma proposta.
  IF OLD.situacao <> 'proposta' OR NEW.situacao NOT IN ('aceita', 'recusada')
     OR NEW.prospect_id <> OLD.prospect_id OR NEW.letra <> OLD.letra OR NEW.estado <> OLD.estado
     OR NEW.texto <> OLD.texto OR NEW.fonte IS DISTINCT FROM OLD.fonte OR NEW.origem <> OLD.origem THEN
    RAISE EXCEPTION 'Só dá para aceitar ou recusar uma evidência proposta.' USING ERRCODE = 'PU001';
  END IF;
  NEW.tenant_id := OLD.tenant_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.decidida_por := quem;
  NEW.decidida_em := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_bant_evidencias_guard() IS
  'Herda o tenant da oportunidade; evidência da IA nasce proposta; depois só aceitar ou recusar.';

DROP TRIGGER IF EXISTS prospect_bant_evidencias_guard ON public.prospect_bant_evidencias;
CREATE TRIGGER prospect_bant_evidencias_guard
  BEFORE INSERT OR UPDATE ON public.prospect_bant_evidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_bant_evidencias_guard();

ALTER TABLE public.prospect_bant_evidencias ENABLE ROW LEVEL SECURITY;

-- A mesma régua das atividades da oportunidade: ler com prospeccao:ler, escrever com editar.
CREATE POLICY "Prospeccao readers can view bant evidence"
  ON public.prospect_bant_evidencias FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_bant_evidencias.prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:ler')
  ));

CREATE POLICY "Prospeccao editors can insert bant evidence"
  ON public.prospect_bant_evidencias FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_bant_evidencias.prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

CREATE POLICY "Prospeccao editors can decide bant evidence"
  ON public.prospect_bant_evidencias FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_bant_evidencias.prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_bant_evidencias.prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

-- Sem DELETE: a lista é o histórico do BANT (quem disse o quê, quando, e o que foi recusado).
