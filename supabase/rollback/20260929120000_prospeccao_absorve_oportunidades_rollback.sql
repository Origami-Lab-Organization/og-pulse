-- Reversão de 20260929120000_prospeccao_absorve_oportunidades.sql.
--
-- Reconstrói o Pipeline de Oportunidades a partir do schema `legado_oportunidades`, que a
-- migração deixou com a cópia fiel de `leads`, das filhas, dos contatos convertidos e das
-- capacidades. A DDL abaixo (seção 2) foi extraída do schema de PRODUÇÃO em 29/09/2026
-- (`supabase db dump`), não reescrita à mão — inclui `get_crm_received_value_unguarded`, que
-- só existe lá.
--
-- COM PERDA DE DADO — exporte `prospects`, `budgets` e `projects` antes:
--   - some tudo o que foi feito nos contatos migrados DEPOIS da migração (atividades,
--     tarefas, ganho, perda): o contato migrado é apagado inteiro;
--   - `estimated_value`, `notes` e `competitor_name` saem de TODOS os contatos, inclusive dos
--     que já existiam e ganharam observação depois;
--   - orçamento e projeto criados a partir de contato depois da migração perdem o vínculo
--     (`budgets.prospect_id` e `projects.prospect_id` saem);
--   - o acesso à Prospecção espelhado de `pipeline:*` fica (acrescentar acesso não se
--     desfaz às cegas — confira `role_capabilities` antes de retirar);
--   - arquivos anexados no bucket `lead-attachments` nunca saíram de lá — nada a fazer.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

-- Como no pg_dump: as funções SQL da seção 2 citam `leads` antes de a tabela existir.
SET LOCAL check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- 1. Colunas que apontavam para `leads` voltam, vazias por enquanto
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS converted_lead_id uuid;
ALTER TABLE public.projects  ADD COLUMN IF NOT EXISTS lead_id uuid;

-- ---------------------------------------------------------------------------
-- 2. DDL original do Pipeline (extraída do schema de produção)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."get_crm_received_value"("p_tenant_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.assert_tenant_access(p_tenant_id);
  RETURN public.get_crm_received_value_unguarded(p_tenant_id);
END;
$$;

ALTER FUNCTION "public"."get_crm_received_value"("p_tenant_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_crm_received_value_unguarded"("p_tenant_id" "uuid") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(SUM(pi.value), 0)
  FROM project_installments pi
  JOIN projects p ON pi.project_id = p.id
  JOIN leads l ON p.budget_id = l.budget_id
  WHERE l.tenant_id = p_tenant_id
    AND l.crm_stage = 'closed'
    AND p.status != 'cancelled'
    AND pi.status = 'received'
    AND EXTRACT(YEAR FROM pi.payment_date) = EXTRACT(YEAR FROM NOW())
$$;

ALTER FUNCTION "public"."get_crm_received_value_unguarded"("p_tenant_id" "uuid") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."lead_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lead_activity_log_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['created'::"text", 'stage_changed'::"text", 'lead_updated'::"text", 'budget_created'::"text", 'budget_updated'::"text", 'budget_unlinked'::"text", 'archived'::"text", 'unarchived'::"text", 'closed'::"text", 'closed_lost'::"text", 'moved_to_stand_by'::"text", 'stand_by_resumed'::"text", 'note_added'::"text"])))
);

ALTER TABLE "public"."lead_activity_log" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."lead_follow_ups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "description" "text" NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notified" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lead_follow_ups_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'done'::"text", 'skipped'::"text"])))
);

ALTER TABLE "public"."lead_follow_ups" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."lead_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "interaction_date" "date" NOT NULL,
    "channel" "text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "lead_interactions_channel_check" CHECK (("channel" = ANY (ARRAY['phone'::"text", 'whatsapp'::"text", 'email'::"text", 'in_person'::"text", 'video_call'::"text", 'linkedin'::"text", 'other'::"text"])))
);

ALTER TABLE "public"."lead_interactions" OWNER TO "postgres";

COMMENT ON TABLE "public"."lead_interactions" IS 'Log of past interactions (calls, meetings, messages) with CRM leads';

COMMENT ON COLUMN "public"."lead_interactions"."attachments" IS 'Lista de anexos do comentário: [{ path, name, size, type }] — arquivos no bucket lead-attachments';

CREATE TABLE IF NOT EXISTS "public"."lead_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "service_id" "uuid" NOT NULL,
    "custom_value" numeric(14,2) DEFAULT NULL::numeric,
    "custom_billing_unit" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."lead_services" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "company_name" "text",
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "estimated_value" numeric DEFAULT 0 NOT NULL,
    "source" "text",
    "notes" "text",
    "crm_stage" "text" DEFAULT 'screening'::"text" NOT NULL,
    "budget_id" "uuid",
    "archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archive_reason" "text",
    "archive_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid",
    "service_line" "text",
    "responsible_id" "uuid",
    "closed_at" timestamp with time zone,
    "competitor_name" "text",
    "restored_at" timestamp with time zone,
    "lost_at" timestamp with time zone,
    "stand_by_return_stage" "text",
    "stand_by_since" timestamp with time zone,
    "prospect_id" "uuid",
    "first_touch_at" "date"
);

ALTER TABLE "public"."leads" OWNER TO "postgres";

COMMENT ON COLUMN "public"."leads"."competitor_name" IS 'Concorrente que venceu a oportunidade. Preenchido apenas quando archive_reason = ''competitor'' (GP-J7). NULL caso contrário.';

COMMENT ON COLUMN "public"."leads"."restored_at" IS 'Momento da última restauração (unarchive). Setado no unarchive, NULL no arquivamento. Badge "Reativada" 48h derivado em runtime.';

COMMENT ON COLUMN "public"."leads"."lost_at" IS 'Quando a oportunidade foi perdida. Perda e arquivamento são o mesmo evento: implica archived=true e crm_stage=''closed_lost''. Motivo/observações/concorrente ficam em archive_reason/archive_notes/competitor_name.';

COMMENT ON COLUMN "public"."leads"."stand_by_return_stage" IS 'Etapa do funil em que a oportunidade estava ao entrar em Stand By. É para onde ela volta ao ser retomada.';

COMMENT ON COLUMN "public"."leads"."stand_by_since" IS 'Quando a oportunidade entrou em Stand By (crm_stage = ''stand_by''). Limpo ao retomar.';

COMMENT ON COLUMN "public"."leads"."prospect_id" IS 'Contato de prospecção que originou esta oportunidade, quando houve. Link de volta, no mesmo espírito de projects.lead_id.';

COMMENT ON COLUMN "public"."leads"."first_touch_at" IS 'Data do primeiro toque de prospecção, herdada na conversão. Base do tempo de ciclo real.';

ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lead_follow_ups"
    ADD CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."lead_services"
    ADD CONSTRAINT "lead_services_lead_id_service_id_key" UNIQUE ("lead_id", "service_id");

ALTER TABLE ONLY "public"."lead_services"
    ADD CONSTRAINT "lead_services_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");

CREATE INDEX "idx_lead_activity_log_created_at" ON "public"."lead_activity_log" USING "btree" ("created_at" DESC);

CREATE INDEX "idx_lead_activity_log_lead_id" ON "public"."lead_activity_log" USING "btree" ("lead_id");

CREATE INDEX "idx_lead_activity_log_tenant_id" ON "public"."lead_activity_log" USING "btree" ("tenant_id");

CREATE INDEX "idx_lead_activity_log_type" ON "public"."lead_activity_log" USING "btree" ("activity_type");

CREATE INDEX "idx_lead_follow_ups_assigned_to" ON "public"."lead_follow_ups" USING "btree" ("assigned_to");

CREATE INDEX "idx_lead_follow_ups_lead_id" ON "public"."lead_follow_ups" USING "btree" ("lead_id");

CREATE INDEX "idx_lead_follow_ups_pending_due" ON "public"."lead_follow_ups" USING "btree" ("status", "scheduled_at", "notified");

CREATE INDEX "idx_lead_follow_ups_scheduled_at" ON "public"."lead_follow_ups" USING "btree" ("scheduled_at");

CREATE INDEX "idx_lead_follow_ups_status" ON "public"."lead_follow_ups" USING "btree" ("status");

CREATE INDEX "idx_lead_follow_ups_tenant_id" ON "public"."lead_follow_ups" USING "btree" ("tenant_id");

CREATE INDEX "idx_lead_interactions_date" ON "public"."lead_interactions" USING "btree" ("interaction_date" DESC);

CREATE INDEX "idx_lead_interactions_lead_id" ON "public"."lead_interactions" USING "btree" ("lead_id");

CREATE INDEX "idx_lead_interactions_tenant_id" ON "public"."lead_interactions" USING "btree" ("tenant_id");

CREATE INDEX "idx_lead_services_lead_id" ON "public"."lead_services" USING "btree" ("lead_id");

CREATE INDEX "idx_lead_services_service_id" ON "public"."lead_services" USING "btree" ("service_id");

CREATE INDEX "idx_lead_services_tenant_id" ON "public"."lead_services" USING "btree" ("tenant_id");

CREATE INDEX "idx_leads_closed_window" ON "public"."leads" USING "btree" ("tenant_id", "crm_stage", "closed_at") WHERE (NOT "archived");

CREATE INDEX "leads_prospect_id_idx" ON "public"."leads" USING "btree" ("prospect_id") WHERE ("prospect_id" IS NOT NULL);

CREATE OR REPLACE TRIGGER "update_leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_activity_log"
    ADD CONSTRAINT "lead_activity_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_follow_ups"
    ADD CONSTRAINT "lead_follow_ups_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."lead_follow_ups"
    ADD CONSTRAINT "lead_follow_ups_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."lead_follow_ups"
    ADD CONSTRAINT "lead_follow_ups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."lead_follow_ups"
    ADD CONSTRAINT "lead_follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_follow_ups"
    ADD CONSTRAINT "lead_follow_ups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."lead_services"
    ADD CONSTRAINT "lead_services_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."lead_services"
    ADD CONSTRAINT "lead_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."lead_services"
    ADD CONSTRAINT "lead_services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospects"("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "public"."employees"("id");

ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");

ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id");

ALTER TABLE ONLY "public"."prospects"
    ADD CONSTRAINT "prospects_converted_lead_id_fkey" FOREIGN KEY ("converted_lead_id") REFERENCES "public"."leads"("id");

CREATE POLICY "Admins and managers can delete follow-ups" ON "public"."lead_follow_ups" FOR DELETE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can delete interactions" ON "public"."lead_interactions" FOR DELETE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can delete lead activities" ON "public"."lead_activity_log" FOR DELETE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can delete leads" ON "public"."leads" FOR DELETE USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can insert follow-ups" ON "public"."lead_follow_ups" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can insert interactions" ON "public"."lead_interactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can insert lead activities" ON "public"."lead_activity_log" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can insert leads" ON "public"."leads" FOR INSERT WITH CHECK ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can update follow-ups" ON "public"."lead_follow_ups" FOR UPDATE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can update interactions" ON "public"."lead_interactions" FOR UPDATE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can update leads" ON "public"."leads" FOR UPDATE USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "Admins and managers can view follow-ups" ON "public"."lead_follow_ups" FOR SELECT TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:ler'::"text"));

CREATE POLICY "Admins and managers can view interactions" ON "public"."lead_interactions" FOR SELECT TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:ler'::"text"));

CREATE POLICY "Admins and managers can view lead activities" ON "public"."lead_activity_log" FOR SELECT TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:ler'::"text"));

CREATE POLICY "Admins and managers can view leads" ON "public"."leads" FOR SELECT TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:ler'::"text"));

ALTER TABLE "public"."lead_activity_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lead_follow_ups" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lead_interactions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."lead_services" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_services_delete" ON "public"."lead_services" FOR DELETE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "lead_services_insert" ON "public"."lead_services" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

CREATE POLICY "lead_services_select" ON "public"."lead_services" FOR SELECT TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:ler'::"text"));

CREATE POLICY "lead_services_update" ON "public"."lead_services" FOR UPDATE TO "authenticated" USING ("public"."has_capability"("auth"."uid"(), "tenant_id", 'pipeline:editar'::"text"));

ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON FUNCTION "public"."get_crm_received_value"("p_tenant_id" "uuid") TO "anon";

GRANT ALL ON FUNCTION "public"."get_crm_received_value"("p_tenant_id" "uuid") TO "authenticated";

GRANT ALL ON FUNCTION "public"."get_crm_received_value"("p_tenant_id" "uuid") TO "service_role";

REVOKE ALL ON FUNCTION "public"."get_crm_received_value_unguarded"("p_tenant_id" "uuid") FROM PUBLIC;

GRANT ALL ON FUNCTION "public"."get_crm_received_value_unguarded"("p_tenant_id" "uuid") TO "anon";

GRANT ALL ON FUNCTION "public"."get_crm_received_value_unguarded"("p_tenant_id" "uuid") TO "authenticated";

GRANT ALL ON FUNCTION "public"."get_crm_received_value_unguarded"("p_tenant_id" "uuid") TO "service_role";

GRANT ALL ON TABLE "public"."lead_activity_log" TO "anon";

GRANT ALL ON TABLE "public"."lead_activity_log" TO "authenticated";

GRANT ALL ON TABLE "public"."lead_activity_log" TO "service_role";

GRANT ALL ON TABLE "public"."lead_follow_ups" TO "anon";

GRANT ALL ON TABLE "public"."lead_follow_ups" TO "authenticated";

GRANT ALL ON TABLE "public"."lead_follow_ups" TO "service_role";

GRANT ALL ON TABLE "public"."lead_interactions" TO "anon";

GRANT ALL ON TABLE "public"."lead_interactions" TO "authenticated";

GRANT ALL ON TABLE "public"."lead_interactions" TO "service_role";

GRANT ALL ON TABLE "public"."lead_services" TO "anon";

GRANT ALL ON TABLE "public"."lead_services" TO "authenticated";

GRANT ALL ON TABLE "public"."lead_services" TO "service_role";

GRANT ALL ON TABLE "public"."leads" TO "anon";

GRANT ALL ON TABLE "public"."leads" TO "authenticated";

GRANT ALL ON TABLE "public"."leads" TO "service_role";

-- ---------------------------------------------------------------------------
-- 3. Dados de volta, do arquivo
-- ---------------------------------------------------------------------------

INSERT INTO public.leads             SELECT * FROM legado_oportunidades.leads;
INSERT INTO public.lead_services     SELECT * FROM legado_oportunidades.lead_services;
INSERT INTO public.lead_interactions SELECT * FROM legado_oportunidades.lead_interactions;
INSERT INTO public.lead_follow_ups   SELECT * FROM legado_oportunidades.lead_follow_ups;
INSERT INTO public.lead_activity_log SELECT * FROM legado_oportunidades.lead_activity_log;

UPDATE public.projects pr
   SET lead_id = x.lead_id
  FROM legado_oportunidades.projects_lead_id x
 WHERE pr.id = x.project_id;

-- ---------------------------------------------------------------------------
-- 4. A Prospecção volta a como estava
-- ---------------------------------------------------------------------------

ALTER TABLE public.prospects DISABLE TRIGGER prospect_stage_changes_on_update;
ALTER TABLE public.prospects DISABLE TRIGGER prospects_outcome_rules;
ALTER TABLE public.prospects DISABLE TRIGGER prospects_protect_first_touch;

-- Contatos criados pela migração saem inteiros (atividades, tarefas e histórico em cascata).
DELETE FROM public.prospects p
 USING legado_oportunidades.de_para d
 WHERE d.prospect_id = p.id AND NOT d.contato_existente;

DELETE FROM public.prospect_companies c
 USING legado_oportunidades.empresas_criadas e
 WHERE e.company_id = c.id
   AND NOT EXISTS (SELECT 1 FROM public.prospects p WHERE p.company_id = c.id);

-- "Convertido" volta a ser etapa válida antes de a linha voltar para ela.
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_stage_valid;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_stage_valid CHECK (stage IN (
  'a_abordar', 'em_cadencia', 'respondeu', 'reuniao_agendada', 'reuniao_feita', 'qualificado',
  'ganho', 'descartado',
  'sem_resposta', 'convertido'
));

-- Contatos convertidos: o que a migração acrescentou sai, e a linha volta a "Convertido".
DELETE FROM public.prospect_activities a
 USING legado_oportunidades.prospects_convertidos o
 WHERE a.prospect_id = o.id AND a.sequence_no > o.activity_count;

DELETE FROM public.prospect_tasks t
 USING legado_oportunidades.prospects_convertidos o,
       legado_oportunidades.de_para d,
       legado_oportunidades.lead_follow_ups f
 WHERE t.prospect_id = o.id
   AND d.prospect_id = o.id
   AND f.lead_id = d.lead_id
   AND t.created_at = f.created_at;

DELETE FROM public.prospect_stage_changes s
 USING legado_oportunidades.prospects_convertidos o, legado_oportunidades.execucao x
 WHERE s.prospect_id = o.id AND s.created_at = x.em;

UPDATE public.prospects p
   SET stage = o.stage, owner_id = o.owner_id, contact_email = o.contact_email,
       contact_phone = o.contact_phone, lever = o.lever, activity_count = o.activity_count,
       first_touch_at = o.first_touch_at, next_activity_on = o.next_activity_on,
       discard_reason = o.discard_reason, discarded_at = o.discarded_at, won_on = o.won_on,
       won_value = o.won_value, closed_at = o.closed_at, converted_lead_id = o.converted_lead_id
  FROM legado_oportunidades.prospects_convertidos o
 WHERE p.id = o.id;

ALTER TABLE public.prospects ENABLE TRIGGER prospects_protect_first_touch;
ALTER TABLE public.prospects ENABLE TRIGGER prospects_outcome_rules;
ALTER TABLE public.prospects ENABLE TRIGGER prospect_stage_changes_on_update;

ALTER TABLE public.prospects ADD CONSTRAINT prospects_converted_has_lead
  CHECK (stage <> 'convertido' OR converted_lead_id IS NOT NULL);

ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_estimated_value_valid;
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_notes_length;
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS prospects_competitor_name_length;
ALTER TABLE public.prospects
  DROP COLUMN IF EXISTS estimated_value,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS competitor_name;

DROP INDEX IF EXISTS public.budgets_prospect_id_key;
ALTER TABLE public.budgets DROP COLUMN IF EXISTS prospect_id;
DROP INDEX IF EXISTS public.projects_prospect_id_idx;
ALTER TABLE public.projects DROP COLUMN IF EXISTS prospect_id;

-- ---------------------------------------------------------------------------
-- 5. Capacidades do Pipeline
-- ---------------------------------------------------------------------------

INSERT INTO public.capabilities              SELECT * FROM legado_oportunidades.capabilities ON CONFLICT DO NOTHING;
INSERT INTO public.role_capabilities         SELECT * FROM legado_oportunidades.role_capabilities ON CONFLICT DO NOTHING;
INSERT INTO public.user_capability_overrides SELECT * FROM legado_oportunidades.user_capability_overrides ON CONFLICT DO NOTHING;
INSERT INTO public.default_role_capabilities SELECT * FROM legado_oportunidades.default_role_capabilities ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Anexos antigos: policy por tenant, como em 20260619120000
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "lead-attachments: prospeccao readers can read" ON storage.objects;
DROP POLICY IF EXISTS "lead-attachments: prospeccao editors can delete" ON storage.objects;

CREATE POLICY "lead-attachments: tenant can read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lead-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "lead-attachments: tenant can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lead-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "lead-attachments: tenant can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lead-attachments'
    AND public.user_belongs_to_tenant(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- 7. Painel de uso volta a contar `leads` (versão de produção)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."platform_tenant_usage"() RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "plan" "text", "trial_ends_at" timestamp with time zone, "created_at" timestamp with time zone, "segment" "text", "owner_name" "text", "owner_email" "text", "owner_phone" "text", "last_sign_in_at" timestamp with time zone, "last_created_at" timestamp with time zone, "people_count" integer, "signed_in_count" integer, "tour_seen_count" integer, "client_count" integer, "service_count" integer, "project_count" integer, "member_count" integer, "logged_hours_count" integer, "opportunity_count" integer, "cost_center_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT id INTO _owner FROM public.tenants WHERE is_platform_owner LIMIT 1;

  -- As duas travas juntas. Sem tenant dono definido, ninguém lê nada.
  IF _owner IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.user_tenant_roles utr
       WHERE utr.user_id = auth.uid()
         AND utr.tenant_id = _owner
         AND public.has_capability(auth.uid(), _owner, 'plataforma:ler-uso')
     )
  THEN
    RAISE EXCEPTION 'Sem acesso ao uso da plataforma.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.plan,
    t.trial_ends_at,
    t.created_at,
    t.segment,
    owner.nome,
    owner.email,
    owner.telefone,
    (SELECT max(u.last_sign_in_at)
       FROM public.employees e JOIN auth.users u ON u.id = e.auth_id
      WHERE e.tenant_id = t.id),
    -- Última CRIAÇÃO de dado, que é diferente de última visita: tenant que só abre a tela
    -- aparece ativo aqui e paradão nesta coluna. É o diagnóstico que o painel entrega.
    GREATEST(
      (SELECT max(p.created_at) FROM public.projects p WHERE p.tenant_id = t.id),
      (SELECT max(c.created_at) FROM public.clients c WHERE c.tenant_id = t.id),
      (SELECT max(pt.created_at) FROM public.project_timesheets pt
         JOIN public.projects p2 ON p2.id = pt.project_id WHERE p2.tenant_id = t.id),
      (SELECT max(at2.created_at) FROM public.activity_timesheets at2 WHERE at2.tenant_id = t.id)
    ),
    (SELECT count(*)::integer FROM public.employees e WHERE e.tenant_id = t.id),
    (SELECT count(u.last_sign_in_at)::integer
       FROM public.employees e JOIN auth.users u ON u.id = e.auth_id WHERE e.tenant_id = t.id),
    (SELECT count(e.tour_seen_at)::integer FROM public.employees e WHERE e.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.clients c WHERE c.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.services s WHERE s.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.projects p WHERE p.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.project_members pm
       JOIN public.projects p3 ON p3.id = pm.project_id WHERE p3.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.project_timesheets pt2
       JOIN public.projects p4 ON p4.id = pt2.project_id WHERE p4.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.leads l WHERE l.tenant_id = t.id),
    (SELECT count(*)::integer FROM public.cost_centers cc WHERE cc.tenant_id = t.id)
  FROM public.tenants t
  -- O admin que criou a conta: o funcionário mais antigo com papel de sistema admin.
  LEFT JOIN LATERAL (
    SELECT e.nome, e.email, e.telefone
    FROM public.employees e
    WHERE e.tenant_id = t.id AND e.system_role = 'admin'
    ORDER BY e.created_at
    LIMIT 1
  ) owner ON true
  -- O próprio tenant da casa fica fora: ele não é cliente, e as métricas dele distorceriam
  -- o funil de ativação (mesma escolha do projete.app).
  WHERE NOT t.is_platform_owner
  ORDER BY t.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Lembrete diário dos follow-ups (a Edge Function precisa ser publicada de novo)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT FROM cron.job WHERE jobname = 'notify-lead-follow-ups-daily') THEN
    PERFORM cron.unschedule('notify-lead-follow-ups-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-lead-follow-ups-daily',
  '0 8 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notify-lead-follow-ups',
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || current_setting('app.service_role_key')
                 ),
      body    := '{}'::jsonb
    ) AS request_id
  $$
);

-- O arquivo fica: apagar `legado_oportunidades` é decisão à parte, depois de conferido.
