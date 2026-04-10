
-- ─── Project Activity Cards ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_cards (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title               text NOT NULL,
  card_type           text NOT NULL DEFAULT 'story'
                        CHECK (card_type IN ('story', 'bug', 'tech_debt', 'task')),
  user_story          text,
  acceptance_criteria text,
  points              int,
  assignee_id         uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  column_name         text NOT NULL DEFAULT 'product_backlog'
                        CHECK (column_name IN ('product_backlog', 'sprint_backlog', 'in_dev', 'in_test', 'in_deploy', 'done')),
  position            int NOT NULL DEFAULT 0,
  sprint_id           uuid,
  is_blocked          boolean NOT NULL DEFAULT false,
  blocked_reason      text,
  created_by          uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_activity_cards_project_id_idx ON public.project_activity_cards(project_id);
CREATE INDEX IF NOT EXISTS project_activity_cards_tenant_id_idx ON public.project_activity_cards(tenant_id);
CREATE INDEX IF NOT EXISTS project_activity_cards_column_pos_idx ON public.project_activity_cards(project_id, column_name, position);

ALTER TABLE public.project_activity_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity cards in their tenant"
  ON public.project_activity_cards FOR SELECT TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can create activity cards in their tenant"
  ON public.project_activity_cards FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can update activity cards in their tenant"
  ON public.project_activity_cards FOR UPDATE TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can delete activity cards in their tenant"
  ON public.project_activity_cards FOR DELETE TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE TRIGGER update_project_activity_cards_updated_at
  BEFORE UPDATE ON public.project_activity_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Project Activity Card History ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_activity_card_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES public.project_activity_cards(id) ON DELETE CASCADE,
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  field      text NOT NULL,
  old_value  text,
  new_value  text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_activity_card_history_card_id_idx ON public.project_activity_card_history(card_id);
CREATE INDEX IF NOT EXISTS project_activity_card_history_tenant_id_idx ON public.project_activity_card_history(tenant_id);

ALTER TABLE public.project_activity_card_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity card history in their tenant"
  ON public.project_activity_card_history FOR SELECT TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can create activity card history in their tenant"
  ON public.project_activity_card_history FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (public.get_user_tenant_id(auth.uid())));

-- ─── History trigger ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.project_activity_cards_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id INTO v_employee_id FROM public.employees WHERE auth_id = auth.uid() LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.project_activity_card_history(card_id, tenant_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, NEW.tenant_id, v_employee_id, 'status', NULL, NEW.column_name);

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.column_name IS DISTINCT FROM NEW.column_name THEN
      INSERT INTO public.project_activity_card_history(card_id, tenant_id, changed_by, field, old_value, new_value)
      VALUES (NEW.id, NEW.tenant_id, v_employee_id, 'status', OLD.column_name, NEW.column_name);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER project_activity_cards_history_trg
  AFTER INSERT OR UPDATE ON public.project_activity_cards
  FOR EACH ROW EXECUTE FUNCTION public.project_activity_cards_history();
