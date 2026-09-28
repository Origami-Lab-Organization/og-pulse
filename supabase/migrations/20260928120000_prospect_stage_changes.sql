-- Prospecção — histórico de mudança de etapa (28/09/2026).
--
-- Pedido de 28/09/2026 (Guilherme): a aba Métricas precisa mostrar o que aconteceu num
-- período e a evolução semana a semana — "reuniões agendadas na semana", "qualificadas no
-- mês". Até aqui o módulo guardava só a etapa ATUAL: dava para saber quem está em Reunião
-- agendada, nunca QUANDO chegou lá. Sem essa data, o funil do período lia a etapa de hoje
-- de quem foi tocado no período, e um contato que agendou em agosto contava como reunião
-- agendada da semana em que recebeu um toque qualquer.
--
-- Uma linha por mudança de etapa, gravada por trigger em `prospects` — o mesmo ponto por
-- onde passam a tela, o MCP e o trigger de cadência (`prospect_activities_advance`), então
-- nenhuma mudança escapa e nenhum cliente precisa lembrar de registrar.
--
-- Histórico imutável pela API: não há policy de INSERT/UPDATE/DELETE. Só o trigger
-- (SECURITY DEFINER) escreve, e o tenant vem da própria linha de `prospects` que acabou de
-- passar pela RLS dela — nunca de parâmetro (ADR-0021).
--
-- O PASSADO É RECONSTRUÍDO SÓ ONDE HÁ DATA REAL (decisão de 28/09/2026):
--   - cadastro (`created_at`), 1º toque e 1ª resposta (`prospect_activities`), descarte
--     (`discarded_at`), conversão (`closed_at`) e "Sem resposta" (data do último toque)
--     entram com `source = 'reconstruido'`;
--   - Reunião agendada, Reunião feita e Oportunidade qualificada NÃO têm data em lugar
--     nenhum e não são inventadas. Cada contato existente ganha um marco `anterior` com a
--     etapa em que estava hoje: a métrica entende que essas etapas foram alcançadas em data
--     desconhecida e não as conta em período nenhum. É isso que marca, nos gráficos, a data
--     em que o histórico começa.
--   Preencher com `updated_at` daria um gráfico cheio desde o início e com datas falsas.
--
-- Dia do evento no fuso de Brasília: `current_date` do banco é UTC e jogaria para o dia
-- seguinte tudo o que acontece depois das 21h.
--
-- Acesso: `prospeccao:ler`, como o resto do módulo.
--
-- Rollback: supabase/rollback/20260928120000_prospect_stage_changes_rollback.sql

CREATE TABLE public.prospect_stage_changes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prospect_id    uuid        NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  -- NULL = cadastro do contato, ou etapa de origem desconhecida na reconstrução.
  from_stage     text,
  to_stage       text        NOT NULL,
  -- Só quando to_stage = 'descartado': o motivo da época, que o contato perde ao reabrir.
  discard_reason text,
  occurred_on    date        NOT NULL,
  source         text        NOT NULL DEFAULT 'registrado',
  changed_by     uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prospect_stage_changes_source_valid
    CHECK (source IN ('registrado', 'reconstruido', 'anterior'))
);

COMMENT ON TABLE public.prospect_stage_changes IS
  'Histórico de etapa dos contatos de prospecção (28/09/2026). Gravado só pelo trigger '
  'prospect_stage_changes_record; imutável pela API.';
COMMENT ON COLUMN public.prospect_stage_changes.source IS
  'registrado = gravado pelo trigger no momento da mudança; reconstruido = backfill a partir '
  'de uma data real; anterior = etapa em que o contato estava quando o histórico começou '
  '(data desconhecida — não conta em período nenhum).';
COMMENT ON COLUMN public.prospect_stage_changes.occurred_on IS
  'Dia do evento no fuso America/Sao_Paulo.';

CREATE INDEX prospect_stage_changes_tenant_day_idx
  ON public.prospect_stage_changes (tenant_id, occurred_on);

CREATE INDEX prospect_stage_changes_prospect_idx
  ON public.prospect_stage_changes (prospect_id, occurred_on);

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prospect_stage_changes_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  origem text;
BEGIN
  -- IF, e não CASE: em INSERT não há OLD, e a expressão nem deve ser avaliada.
  IF TG_OP = 'UPDATE' THEN
    origem := OLD.stage;
  END IF;

  INSERT INTO public.prospect_stage_changes
    (tenant_id, prospect_id, from_stage, to_stage, discard_reason, occurred_on, source, changed_by)
  VALUES (
    NEW.tenant_id,
    NEW.id,
    origem,
    NEW.stage,
    CASE WHEN NEW.stage = 'descartado' THEN NEW.discard_reason END,
    (now() AT TIME ZONE 'America/Sao_Paulo')::date,
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

COMMENT ON FUNCTION public.prospect_stage_changes_record() IS
  'Grava cada mudança de etapa de prospects em prospect_stage_changes. Função de trigger — '
  'não é chamável como RPC.';

CREATE TRIGGER prospect_stage_changes_on_insert
  AFTER INSERT ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.prospect_stage_changes_record();

-- O trigger de cadência reescreve `stage` a cada atividade, inclusive com o mesmo valor:
-- o WHEN deixa passar só mudança de verdade.
CREATE TRIGGER prospect_stage_changes_on_update
  AFTER UPDATE OF stage ON public.prospects
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
  EXECUTE FUNCTION public.prospect_stage_changes_record();

-- ---------------------------------------------------------------------------
-- Reconstrução do passado — só o que tem data real
-- ---------------------------------------------------------------------------

-- Cadastro: todo contato nasce em "A abordar".
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source, changed_by)
SELECT p.tenant_id, p.id, NULL, 'a_abordar',
       (p.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'reconstruido', p.created_by
  FROM public.prospects p;

-- 1º toque: com resposta vai direto para "Respondeu"; sem resposta, entra em cadência.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source, changed_by)
SELECT a.tenant_id, a.prospect_id, 'a_abordar',
       CASE WHEN a.got_response THEN 'respondeu' ELSE 'em_cadencia' END,
       a.activity_date, 'reconstruido', a.created_by
  FROM (
    SELECT DISTINCT ON (prospect_id) *
      FROM public.prospect_activities
     ORDER BY prospect_id, sequence_no
  ) a;

-- 1ª resposta, quando não foi no 1º toque.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source, changed_by)
SELECT r.tenant_id, r.prospect_id, 'em_cadencia', 'respondeu',
       r.activity_date, 'reconstruido', r.created_by
  FROM (
    SELECT DISTINCT ON (prospect_id) *
      FROM public.prospect_activities
     WHERE got_response
     ORDER BY prospect_id, sequence_no
  ) r
 WHERE r.sequence_no > (
   SELECT min(a.sequence_no) FROM public.prospect_activities a WHERE a.prospect_id = r.prospect_id
 );

-- "Sem resposta": a cadência se esgota no último toque registrado.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source)
SELECT p.tenant_id, p.id, 'em_cadencia', 'sem_resposta', max(a.activity_date), 'reconstruido'
  FROM public.prospects p
  JOIN public.prospect_activities a ON a.prospect_id = p.id
 WHERE p.stage = 'sem_resposta'
 GROUP BY p.tenant_id, p.id;

-- Descarte, com o motivo. A etapa de onde saiu não foi guardada.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, discard_reason, occurred_on, source)
SELECT p.tenant_id, p.id, NULL, 'descartado', p.discard_reason,
       (p.discarded_at AT TIME ZONE 'America/Sao_Paulo')::date, 'reconstruido'
  FROM public.prospects p
 WHERE p.stage = 'descartado'
   AND p.discarded_at IS NOT NULL;

-- Conversão em Oportunidade: só contato qualificado converte.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source)
SELECT p.tenant_id, p.id, 'qualificado', 'convertido',
       (p.closed_at AT TIME ZONE 'America/Sao_Paulo')::date, 'reconstruido'
  FROM public.prospects p
 WHERE p.stage = 'convertido'
   AND p.closed_at IS NOT NULL;

-- Onde cada contato estava quando o histórico começou. Data desconhecida: a métrica não
-- conta as etapas até esta em período nenhum. Ver cabeçalho.
INSERT INTO public.prospect_stage_changes
  (tenant_id, prospect_id, from_stage, to_stage, occurred_on, source)
SELECT p.tenant_id, p.id, NULL, p.stage,
       (now() AT TIME ZONE 'America/Sao_Paulo')::date, 'anterior'
  FROM public.prospects p;

-- ---------------------------------------------------------------------------
-- RLS — leitura por prospeccao:ler; escrita só pelo trigger
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospect_stage_changes ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.prospect_stage_changes FROM anon, authenticated;
GRANT SELECT ON public.prospect_stage_changes TO authenticated;

CREATE POLICY "Prospeccao readers can view stage changes" ON public.prospect_stage_changes
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));
