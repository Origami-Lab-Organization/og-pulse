-- OKRs do Projeto
CREATE TABLE public.project_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'pending',
  progress_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Key Results dos OKRs
CREATE TABLE public.project_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES project_okrs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Stakeholders do Projeto
CREATE TABLE public.project_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  organization TEXT,
  email TEXT,
  phone TEXT,
  influence_level TEXT,
  interest_level TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Milestones do Projeto (Cronograma)
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  planned_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'pending',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_okrs
CREATE POLICY "Users can view project okrs in their tenant"
ON project_okrs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_okrs.project_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project okrs"
ON project_okrs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_okrs.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project okrs"
ON project_okrs FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_okrs.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project okrs"
ON project_okrs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_okrs.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

-- RLS Policies for project_key_results
CREATE POLICY "Users can view project key results in their tenant"
ON project_key_results FOR SELECT
USING (EXISTS (
  SELECT 1 FROM project_okrs o
  JOIN projects p ON p.id = o.project_id
  WHERE o.id = project_key_results.okr_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project key results"
ON project_key_results FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM project_okrs o
  JOIN projects p ON p.id = o.project_id
  WHERE o.id = project_key_results.okr_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project key results"
ON project_key_results FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM project_okrs o
  JOIN projects p ON p.id = o.project_id
  WHERE o.id = project_key_results.okr_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project key results"
ON project_key_results FOR DELETE
USING (EXISTS (
  SELECT 1 FROM project_okrs o
  JOIN projects p ON p.id = o.project_id
  WHERE o.id = project_key_results.okr_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

-- RLS Policies for project_stakeholders
CREATE POLICY "Users can view project stakeholders in their tenant"
ON project_stakeholders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_stakeholders.project_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project stakeholders"
ON project_stakeholders FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_stakeholders.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project stakeholders"
ON project_stakeholders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_stakeholders.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project stakeholders"
ON project_stakeholders FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_stakeholders.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

-- RLS Policies for project_milestones
CREATE POLICY "Users can view project milestones in their tenant"
ON project_milestones FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_milestones.project_id
  AND user_belongs_to_tenant(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can insert project milestones"
ON project_milestones FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_milestones.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can update project milestones"
ON project_milestones FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_milestones.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));

CREATE POLICY "Admins and managers can delete project milestones"
ON project_milestones FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects p
  WHERE p.id = project_milestones.project_id
  AND is_admin_or_manager(auth.uid(), p.tenant_id)
));