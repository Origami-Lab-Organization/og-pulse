-- Prospecção — data das reuniões anteriores ao histórico e data da reunião informada na tela
-- (28/09/2026).
--
-- 1. BACKFILL. A 20260928120000 deixou quem já estava em Reunião agendada/feita com um
--    marco `anterior` (etapa alcançada em data desconhecida), e a aba Métricas mostrava as
--    semanas de setembro como "sem registro". A data existe, só não estava na etapa: ao
--    marcar Reunião feita, a tela registra a reunião como atividade com resposta, na data
--    informada (RegisterMeetingDialog). Conferido contra os dados de produção em 28/09 com
--    Guilherme — os 6 contatos em Reunião feita e o 1 em Reunião agendada:
--      - reunião feita = a última atividade com resposta em formato de reunião
--        (Presencial ou Videoconferência);
--      - reunião agendada = a última atividade antes dela (a conversa em que foi marcada);
--        sem atividade anterior, o 1º toque; nunca depois da reunião. Para quem está só em
--        Reunião agendada, a última atividade.
--    Os eventos entram como `reconstruido` e o marco `anterior` desses contatos sai: agora a
--    data é conhecida. Contato sem atividade que sustente a data fica como estava.
--
-- 2. DATA INFORMADA. Arrastar para Reunião feita datava a etapa no dia do arraste, mesmo
--    quando a pessoa informava no diálogo que a reunião foi dias antes. `set_prospect_stage`
--    move a etapa e passa a data ao trigger por uma configuração LOCAL da transação — o
--    trigger continua sendo o único que escreve o histórico, e a data vale só para esta
--    mudança. Sem data, o trigger usa o dia de hoje, como antes.
--
-- Nenhuma atividade é criada: atividade conta toque, agenda cadência e entra na taxa de
-- resposta. O histórico de etapa já guarda cada arraste.
--
-- Rollback: supabase/rollback/20260928160000_prospect_meeting_dates_rollback.sql

-- ---------------------------------------------------------------------------
-- 1. Backfill das reuniões
-- ---------------------------------------------------------------------------

WITH alvo AS (
  SELECT m.tenant_id, m.prospect_id, m.to_stage
    FROM public.prospect_stage_changes m
   WHERE m.source = 'anterior'
     AND m.to_stage IN ('reuniao_agendada', 'reuniao_feita')
),
reuniao AS (
  SELECT alvo.*, r.activity_date AS feita_em, r.sequence_no AS seq_reuniao
    FROM alvo
    LEFT JOIN LATERAL (
      SELECT a.activity_date, a.sequence_no
        FROM public.prospect_activities a
       WHERE a.prospect_id = alvo.prospect_id
         AND alvo.to_stage = 'reuniao_feita'
         AND a.got_response
         AND a.channel IN ('in_person', 'video_call')
       ORDER BY a.sequence_no DESC
       LIMIT 1
    ) r ON true
),
datas AS (
  SELECT reuniao.*,
         LEAST(
           COALESCE(
             (SELECT a.activity_date
                FROM public.prospect_activities a
               WHERE a.prospect_id = reuniao.prospect_id
                 AND (reuniao.seq_reuniao IS NULL OR a.sequence_no < reuniao.seq_reuniao)
               ORDER BY a.sequence_no DESC
               LIMIT 1),
             p.first_touch_at
           ),
           reuniao.feita_em
         ) AS agendada_em,
         -- Reunião feita só se reconstrói com a atividade da reunião; agendada, sempre que
         -- houver data.
         (reuniao.to_stage = 'reuniao_agendada' OR reuniao.feita_em IS NOT NULL) AS reconstroi
    FROM reuniao
    JOIN public.prospects p ON p.id = reuniao.prospect_id
),
novos AS (
  INSERT INTO public.prospect_stage_changes
    (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source)
  SELECT tenant_id, prospect_id, NULL, 'reuniao_agendada', agendada_em, 'reconstruido'
    FROM datas
   WHERE reconstroi AND agendada_em IS NOT NULL
  UNION ALL
  SELECT tenant_id, prospect_id, 'reuniao_agendada', 'reuniao_feita', feita_em, 'reconstruido'
    FROM datas
   WHERE reconstroi AND agendada_em IS NOT NULL AND feita_em IS NOT NULL
  RETURNING prospect_id
)
DELETE FROM public.prospect_stage_changes m
 USING datas
 WHERE m.prospect_id = datas.prospect_id
   AND m.source = 'anterior'
   AND m.to_stage = datas.to_stage
   AND datas.reconstroi
   AND datas.agendada_em IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. O trigger aceita a data informada
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospect_stage_changes_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  origem text;
  dia    date;
BEGIN
  -- IF, e não CASE: em INSERT não há OLD, e a expressão nem deve ser avaliada.
  IF TG_OP = 'UPDATE' THEN
    origem := OLD.stage;
  END IF;

  -- Definida só por set_prospect_stage, e só dentro da transação dela.
  dia := COALESCE(
    nullif(current_setting('prospeccao.data_da_etapa', true), '')::date,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date
  );

  INSERT INTO public.prospect_stage_changes
    (tenant_id, prospect_id, from_stage, to_stage, discard_reason, occurred_on, source, changed_by)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    origem,
    NEW.stage,
    CASE WHEN NEW.stage = 'descartado' THEN NEW.discard_reason END,
    dia,
    'registrado',
    (SELECT e.id
       FROM public.employees e
      WHERE e.auth_id = auth.uid()
        AND e.tenant_id = NEW.tenant_id
      LIMIT 1)
  );

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Mover etapa com a data do fato
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER: o UPDATE passa pela RLS de prospects como qualquer escrita da tela
-- (prospeccao:editar). Não recebe tenant: a linha diz de quem é.
CREATE OR REPLACE FUNCTION public.set_prospect_stage(
  p_prospect_id uuid,
  p_stage text,
  p_occurred_on date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_occurred_on > (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'A data da etapa não pode ser futura.' USING ERRCODE = 'PU001';
  END IF;

  IF p_occurred_on IS NOT NULL THEN
    PERFORM set_config('prospeccao.data_da_etapa', p_occurred_on::text, true);
  END IF;

  UPDATE public.prospects SET stage = p_stage WHERE id = p_prospect_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contato de prospecção não encontrado.' USING ERRCODE = 'PU001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.set_prospect_stage(uuid, text, date) IS
  'Move a etapa do contato e, com p_occurred_on, data a mudança no histórico pelo dia do '
  'fato (ex.: a reunião foi ontem). Roda como quem chama: a RLS de prospects decide.';

REVOKE ALL ON FUNCTION public.set_prospect_stage(uuid, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_prospect_stage(uuid, text, date) TO authenticated;
