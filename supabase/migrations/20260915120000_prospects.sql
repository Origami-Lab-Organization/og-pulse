-- Prospecção — o card de contato do pipeline frio.
--
-- Decisão de 15/09/2026 (Guilherme): pipeline de prospecção SEPARADO do comercial. Ele
-- mede atenção conquistada, não receita.
--
-- Por isso esta tabela não tem — e não deve ganhar — coluna de valor, probabilidade ou
-- peso de forecast. Reaproveitar `leads` com uma flag teria colocado o registro frio
-- dentro do forecast no dia seguinte: `CRM_STAGE_META` pondera toda oportunidade não
-- arquivada, e `fetchLeads` devolve todas. A previsão voltaria a ser poluída, que é
-- exatamente o que a planilha de prospecção estava evitando.
--
-- Etapas: 5 do funil e 3 terminais que NÃO são avanço. O card só progride por evento
-- verificável — atividade registrada. Abrir e-mail ou aceitar conexão não movem nada, e
-- por isso não existe coluna para eles.
--
-- `next_activity_on` nasce com a data de hoje: card recém-criado aparece na lista
-- "Atividades de hoje" sem ninguém precisar agendar. É a view que sustenta o módulo —
-- filtro `next_activity_on <= hoje AND owner_id = eu`; vazia significa dia encerrado.
--
-- Rollback: supabase/rollback/20260915120000_prospects_rollback.sql

CREATE TABLE public.prospects (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id      uuid        NOT NULL REFERENCES public.prospect_companies(id),
  contact_name    text        NOT NULL,
  contact_role    text,
  contact_email   text,
  contact_phone   text,
  linkedin_url    text,
  primary_channel text        NOT NULL DEFAULT 'email',
  owner_id        uuid        REFERENCES public.employees(id),
  lever           text,
  stage           text        NOT NULL DEFAULT 'a_abordar',
  first_touch_at    date,
  activity_count    integer   NOT NULL DEFAULT 0,
  next_activity_on  date      DEFAULT CURRENT_DATE,
  discard_reason    text,
  discarded_at      timestamptz,
  converted_lead_id uuid      REFERENCES public.leads(id),
  closed_at         timestamptz,
  created_by      uuid        REFERENCES public.employees(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT prospects_contact_name_not_blank CHECK (btrim(contact_name) <> ''),
  CONSTRAINT prospects_lever_length CHECK (lever IS NULL OR char_length(lever) <= 120),

  -- 5 etapas do funil e nem uma a mais; 3 terminais, que não são avanço.
  CONSTRAINT prospects_stage_valid CHECK (stage IN (
    'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'qualificado',
    'sem_resposta', 'descartado', 'convertido'
  )),

  CONSTRAINT prospects_primary_channel_valid CHECK (primary_channel IN (
    'phone', 'whatsapp', 'email', 'in_person', 'video_call', 'linkedin', 'other'
  )),

  -- Lista fechada, nunca texto livre: motivo digitado à mão não vira métrica.
  CONSTRAINT prospects_discard_reason_valid CHECK (discard_reason IS NULL OR discard_reason IN (
    'sem_fit', 'sem_orcamento', 'concorrente_incumbente', 'contato_errado',
    'sem_interesse', 'momento_errado', 'dados_invalidos', 'pediu_para_parar'
  )),

  -- Descartar sem motivo é o que transforma o campo em ruído: o banco recusa.
  CONSTRAINT prospects_discarded_has_reason
    CHECK (stage <> 'descartado' OR discard_reason IS NOT NULL),

  -- Convertido sem a oportunidade correspondente seria um card fechado sem destino.
  CONSTRAINT prospects_converted_has_lead
    CHECK (stage <> 'convertido' OR converted_lead_id IS NOT NULL)
);

COMMENT ON TABLE public.prospects IS
  'Contatos do pipeline de prospecção (15/09/2026). Separado de `leads` de propósito: '
  'mede atenção conquistada, não receita. NÃO adicionar coluna de valor, probabilidade '
  'ou peso de forecast — é a separação que mantém a previsão comercial limpa.';

COMMENT ON COLUMN public.prospects.lever IS
  'Alavanca / origem da lista — por que este contato entrou. Texto livre, editável no card. '
  'É o corte que explica o que faz responder, e sem ele a métrica diz quanto mas não o quê.';
COMMENT ON COLUMN public.prospects.first_touch_at IS
  'Data da primeira atividade. IMUTÁVEL (trigger prospects_protect_first_touch): é dela '
  'que sai o tempo de ciclo real quando o contato vira oportunidade.';
COMMENT ON COLUMN public.prospects.activity_count IS
  'Número da atividade atual. Mantido pelo trigger de prospect_activities, nunca pela tela.';
COMMENT ON COLUMN public.prospects.next_activity_on IS
  'Data da próxima atividade, agendada pela cadência. NULL = nada agendado (respondeu, '
  'cadência esgotada ou encerrado). Alimenta a view "Atividades de hoje".';

-- O índice que sustenta a view central do módulo.
CREATE INDEX prospects_today_idx
  ON public.prospects (tenant_id, owner_id, next_activity_on)
  WHERE stage IN ('a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'qualificado');

CREATE INDEX prospects_tenant_stage_idx ON public.prospects (tenant_id, stage);
CREATE INDEX prospects_company_idx ON public.prospects (company_id);

CREATE TRIGGER update_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- A data do 1º toque é imutável por pedido explícito: se ela puder ser reescrita, o tempo
-- de ciclo do comercial passa a ser uma opinião.
CREATE OR REPLACE FUNCTION public.prospects_protect_first_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.first_touch_at IS NOT NULL AND NEW.first_touch_at IS DISTINCT FROM OLD.first_touch_at THEN
    RAISE EXCEPTION 'A data do primeiro toque não pode ser alterada.'
      USING ERRCODE = 'PU001';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prospects_protect_first_touch() IS
  'Recusa alterar prospects.first_touch_at já preenchida. ERRCODE PU001: a mensagem foi '
  'escrita para o usuário final e passa por mensagemParaUsuario sem tradução.';

CREATE TRIGGER prospects_protect_first_touch
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW
  EXECUTE FUNCTION public.prospects_protect_first_touch();

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospects TO authenticated;

CREATE POLICY "Prospeccao readers can view prospects" ON public.prospects
  FOR SELECT TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:ler'));

CREATE POLICY "Prospeccao editors can insert prospects" ON public.prospects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can update prospects" ON public.prospects
  FOR UPDATE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'))
  WITH CHECK (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));

CREATE POLICY "Prospeccao editors can delete prospects" ON public.prospects
  FOR DELETE TO authenticated
  USING (public.has_capability(auth.uid(), tenant_id, 'prospeccao:editar'));
