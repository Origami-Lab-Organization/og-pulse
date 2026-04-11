-- ─── Sub-tarefas por card ─────────────────────────────────────────────────────
create table if not exists project_activity_tasks (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references project_activity_cards(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  description  text not null,
  assignee_id  uuid references employees(id) on delete set null,
  due_date     date,
  completed_at timestamptz,
  created_by   uuid not null references employees(id),
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);
create index on project_activity_tasks(card_id);
alter table project_activity_tasks enable row level security;
create policy "tenant isolation" on project_activity_tasks
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));
