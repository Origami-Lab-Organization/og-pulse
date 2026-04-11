
create table if not exists public.project_activity_tasks (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.project_activity_cards(id) on delete cascade,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  description  text not null,
  assignee_id  uuid references public.employees(id) on delete set null,
  due_date     date,
  completed_at timestamptz,
  created_by   uuid not null references public.employees(id),
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_project_activity_tasks_card_id on public.project_activity_tasks(card_id);

alter table public.project_activity_tasks enable row level security;

create policy "tenant isolation" on public.project_activity_tasks
  using (tenant_id = public.get_user_tenant_id(auth.uid()));
