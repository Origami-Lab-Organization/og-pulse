
CREATE TABLE public.project_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  title text NOT NULL,
  card_type text NOT NULL DEFAULT 'story',
  user_story text,
  acceptance_criteria text,
  points int,
  assignee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  column_name text NOT NULL DEFAULT 'product_backlog',
  position int NOT NULL DEFAULT 0,
  sprint_id uuid,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  created_by uuid NOT NULL REFERENCES public.employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_cards_project ON public.project_cards(project_id);
CREATE INDEX idx_project_cards_tenant ON public.project_cards(tenant_id);
CREATE INDEX idx_project_cards_sprint ON public.project_cards(sprint_id);
CREATE INDEX idx_project_cards_assignee ON public.project_cards(assignee_id);

ALTER TABLE public.project_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cards in their tenant"
  ON public.project_cards FOR SELECT
  TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can create cards in their tenant"
  ON public.project_cards FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can update cards in their tenant"
  ON public.project_cards FOR UPDATE
  TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE POLICY "Users can delete cards in their tenant"
  ON public.project_cards FOR DELETE
  TO authenticated
  USING (tenant_id = (public.get_user_tenant_id(auth.uid())));

CREATE TRIGGER update_project_cards_updated_at
  BEFORE UPDATE ON public.project_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
