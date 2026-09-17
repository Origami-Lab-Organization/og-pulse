-- Prospecção — atividades (o registro de cada toque) e a automação da cadência.
--
-- Decisão de 15/09/2026 (Guilherme): a regra de cadência mora AQUI, no banco, e não no
-- cliente. Dois motivos.
--
-- O primeiro é o teste de aceite do módulo: registrar uma atividade tem que custar um
-- clique. Com a conta no banco, a tela insere `{prospect_id, channel, got_response}` e o
-- resto — número do toque, próxima data, mudança de etapa — acontece sozinho. Se a tela
-- tivesse que calcular data, o caminho comum ganharia um formulário e ninguém registraria.
--
-- O segundo é TD-0022: Oportunidade hoje tem duas implementações da mesma escrita (tela e
-- `apps/mcp-drive/src/writes.ts`) que divergem em silêncio porque as duas continuam
-- "funcionando". Uma regra que decide etapa não pode nascer duplicada.
--
-- Cadência: ARRAY[3, 4, 5] — após o 1º toque agenda +3 dias, após o 2º +4, após o 3º +5.
-- O 4º toque sem resposta esgota a sequência e o card vai sozinho para "Sem resposta".
-- Mudar para 6 toques é migration nova, com autor e data — que é o rastro desejado, já
-- que a métrica de resposta por número de toque existe justamente para decidir isso.
--
-- Rollback: supabase/rollback/20260915130000_prospect_activities_rollback.sql

CREATE TABLE public.prospect_activities (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id   uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  activity_date date        NOT NULL DEFAULT CURRENT_DATE,
  channel       text        NOT NULL,
  owner_id      uuid        REFERENCES public.employees(id),
  sequence_no   integer     NOT NULL,
  got_response  boolean     NOT NULL DEFAULT false,
  notes         text,
  created_by    uuid        REFERENCES public.employees(id),
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Mesma lista fechada de lead_interactions: canal é vocabulário compartilhado.
  CONSTRAINT prospect_activities_channel_valid CHECK (channel IN (
    'phone', 'whatsapp', 'email', 'in_person', 'video_call', 'linkedin', 'other'
  ))
);

COMMENT ON TABLE public.prospect_activities IS
  'Atividades do pipeline de prospecção (15/09/2026): um registro por toque, filho do '
  'contato. É daqui que sai toda métrica — inclusive a taxa de resposta por número da '
  'atividade, que decide o tamanho da cadência.';

COMMENT ON COLUMN public.prospect_activities.sequence_no IS
  'Número do toque. Preenchido pelo trigger a partir de prospects.activity_count — a tela '
  'nunca envia, para não haver duas contagens.';

-- Rede de segurança contra inserção concorrente: dois cliques simultâneos leriam o mesmo
-- activity_count e gerariam o mesmo número; o índice recusa o segundo em vez de contar errado.
CREATE UNIQUE INDEX prospect_activities_prospect_sequence_key
  ON public.prospect_activities (prospect_id, sequence_no);

CREATE INDEX prospect_activities_prospect_idx
  ON public.prospect_activities (prospect_id, activity_date DESC);

CREATE INDEX prospect_activities_tenant_date_idx
  ON public.prospect_activities (tenant_id, activity_date);

-- ---------------------------------------------------------------------------
-- Automação
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospect_activities_set_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  pai record;
BEGIN
  SELECT tenant_id, owner_id, activity_count
    INTO pai
    FROM public.prospects
   WHERE id = NEW.prospect_id;

  -- NOT FOUND cobre tanto contato inexistente quanto contato que a RLS não deixa ler:
  -- nos dois casos a pessoa precisa de uma frase, não de um erro de NOT NULL mais adiante.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;

  NEW.tenant_id   := COALESCE(NEW.tenant_id, pai.tenant_id);
  NEW.owner_id    := COALESCE(NEW.owner_id, pai.owner_id);
  NEW.sequence_no := pai.activity_count + 1;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospect_activities_set_sequence() IS
  'Numera a atividade e herda tenant/responsável do contato, para a tela precisar enviar '
  'só canal e se houve resposta.';

CREATE TRIGGER prospect_activities_set_sequence
  BEFORE INSERT ON public.prospect_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_activities_set_sequence();

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
    ELSIF NEW.sequence_no > array_length(cadencia, 1) THEN
      etapa   := 'sem_resposta';
      proxima := NULL;
    ELSE
      etapa   := 'em_cadencia';
      proxima := NEW.activity_date + cadencia[NEW.sequence_no];
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
  'Conta o toque, agenda o próximo pela cadência ARRAY[3,4,5] e encerra em "Sem resposta" '
  'quando a sequência se esgota. Fonte ÚNICA da regra de cadência — não replicar no cliente.';

CREATE TRIGGER prospect_activities_advance
  AFTER INSERT ON public.prospect_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_activities_advance();

-- ---------------------------------------------------------------------------
-- RLS — decide pelo pai, como as filhas de orçamento (ADR-0022)
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_activities ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_activities TO authenticated;

CREATE POLICY "Prospeccao readers can view prospect activities" ON public.prospect_activities
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:ler')
  ));

CREATE POLICY "Prospeccao editors can insert prospect activities" ON public.prospect_activities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

CREATE POLICY "Prospeccao editors can update prospect activities" ON public.prospect_activities
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

CREATE POLICY "Prospeccao editors can delete prospect activities" ON public.prospect_activities
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.prospects p
     WHERE p.id = prospect_id
       AND public.has_capability(auth.uid(), p.tenant_id, 'prospeccao:editar')
  ));

-- ---------------------------------------------------------------------------
-- A passagem para o comercial
-- ---------------------------------------------------------------------------
--
-- Só expansão, ambas anuláveis: nada é removido e o frontend antigo continua funcionando
-- durante o build (regra expand/contract — a migration roda DENTRO do build da Vercel,
-- ADR-0026).
--
-- Levar a data do 1º toque é o que faz o tempo de ciclo ser real. Sem ela o comercial
-- mede a partir da reunião e o número fica bonito e falso.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS prospect_id    uuid REFERENCES public.prospects(id),
  ADD COLUMN IF NOT EXISTS first_touch_at date;

COMMENT ON COLUMN public.leads.prospect_id IS
  'Contato de prospecção que originou esta oportunidade, quando houve. Link de volta, no '
  'mesmo espírito de projects.lead_id.';
COMMENT ON COLUMN public.leads.first_touch_at IS
  'Data do primeiro toque de prospecção, herdada na conversão. Base do tempo de ciclo real.';

CREATE INDEX IF NOT EXISTS leads_prospect_id_idx
  ON public.leads (prospect_id)
  WHERE prospect_id IS NOT NULL;
