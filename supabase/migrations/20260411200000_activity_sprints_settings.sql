-- ─── Sprints por projeto ──────────────────────────────────────────────────────
create table if not exists project_activity_sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  number      int  not null,
  start_date  date not null,
  end_date    date not null,
  goal        text,
  status      text not null default 'planned'
                check (status in ('planned', 'active', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on project_activity_sprints(project_id);
alter table project_activity_sprints enable row level security;
create policy "tenant isolation" on project_activity_sprints
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

-- ─── Configurações do board por projeto ──────────────────────────────────────
create table if not exists project_activity_settings (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references projects(id) on delete cascade,
  tenant_id             uuid not null references tenants(id) on delete cascade,
  sprint_duration_weeks int  not null default 2,
  sprint_naming_mode    text not null default 'auto'
                          check (sprint_naming_mode in ('auto', 'manual')),
  wip_in_dev            int,
  wip_in_test           int,
  wip_in_deploy         int,
  constraint project_activity_settings_project_id_key unique (project_id)
);
alter table project_activity_settings enable row level security;
create policy "tenant isolation" on project_activity_settings
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));
