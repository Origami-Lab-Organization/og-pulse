
-- Drop old strategy tables from previous migration (if they exist)
DROP TABLE IF EXISTS strategy_initiatives CASCADE;
DROP TABLE IF EXISTS strategy_checkins CASCADE;
DROP TABLE IF EXISTS strategy_key_results CASCADE;
DROP TABLE IF EXISTS strategy_objectives CASCADE;
DROP TABLE IF EXISTS strategy_cycles CASCADE;

-- ─── Strategy Cycles ──────────────────────────────────────────────────────────
create table if not exists strategy_cycles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  title       text not null,
  start_date  date not null,
  end_date    date not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists strategy_cycles_tenant_id_idx on strategy_cycles(tenant_id);
alter table strategy_cycles enable row level security;

create policy "tenant_read_cycles" on strategy_cycles for select to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_insert_cycles" on strategy_cycles for insert to authenticated
  with check (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_update_cycles" on strategy_cycles for update to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_delete_cycles" on strategy_cycles for delete to authenticated
  using (is_admin_or_manager(auth.uid(), tenant_id));

-- ─── Strategy Objectives ──────────────────────────────────────────────────────
create table if not exists strategy_objectives (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  cycle_id    uuid not null references strategy_cycles(id) on delete cascade,
  title       text not null,
  description text,
  owner_id    uuid references employees(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists strategy_objectives_tenant_id_idx on strategy_objectives(tenant_id);
create index if not exists strategy_objectives_cycle_id_idx  on strategy_objectives(cycle_id);
alter table strategy_objectives enable row level security;

create policy "tenant_read_objectives" on strategy_objectives for select to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_insert_objectives" on strategy_objectives for insert to authenticated
  with check (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_update_objectives" on strategy_objectives for update to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_delete_objectives" on strategy_objectives for delete to authenticated
  using (is_admin_or_manager(auth.uid(), tenant_id));

-- ─── Strategy Key Results ─────────────────────────────────────────────────────
create table if not exists strategy_key_results (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  objective_id   uuid not null references strategy_objectives(id) on delete cascade,
  title          text not null,
  description    text,
  initial_value  numeric not null default 0,
  target_value   numeric not null,
  current_value  numeric not null default 0,
  confidence     numeric not null default 5 check (confidence >= 0 and confidence <= 10),
  owner_id       uuid references employees(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists strategy_key_results_tenant_id_idx    on strategy_key_results(tenant_id);
create index if not exists strategy_key_results_objective_id_idx on strategy_key_results(objective_id);
alter table strategy_key_results enable row level security;

create policy "tenant_read_krs" on strategy_key_results for select to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_insert_krs" on strategy_key_results for insert to authenticated
  with check (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_update_krs" on strategy_key_results for update to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_delete_krs" on strategy_key_results for delete to authenticated
  using (is_admin_or_manager(auth.uid(), tenant_id));

-- ─── Strategy Checkins ────────────────────────────────────────────────────────
create table if not exists strategy_checkins (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  key_result_id  uuid not null references strategy_key_results(id) on delete cascade,
  current_value  numeric not null,
  confidence     numeric not null check (confidence >= 0 and confidence <= 10),
  notes          text,
  created_by     uuid references employees(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists strategy_checkins_tenant_id_idx     on strategy_checkins(tenant_id);
create index if not exists strategy_checkins_key_result_id_idx on strategy_checkins(key_result_id);
alter table strategy_checkins enable row level security;

create policy "tenant_read_checkins" on strategy_checkins for select to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_insert_checkins" on strategy_checkins for insert to authenticated
  with check (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_update_checkins" on strategy_checkins for update to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_delete_checkins" on strategy_checkins for delete to authenticated
  using (is_admin_or_manager(auth.uid(), tenant_id));

-- ─── Strategy Initiatives ─────────────────────────────────────────────────────
create table if not exists strategy_initiatives (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  objective_id uuid not null references strategy_objectives(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'backlog'
                 check (status in ('backlog', 'in_progress', 'review', 'done')),
  priority     text check (priority in ('alta', 'media', 'baixa')),
  effort       smallint check (effort in (1, 2, 3)),
  position     integer not null default 0,
  owner_id     uuid references employees(id) on delete set null,
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists strategy_initiatives_tenant_id_idx    on strategy_initiatives(tenant_id);
create index if not exists strategy_initiatives_objective_id_idx on strategy_initiatives(objective_id);
create index if not exists strategy_initiatives_status_idx       on strategy_initiatives(status);
alter table strategy_initiatives enable row level security;

create policy "tenant_read_initiatives" on strategy_initiatives for select to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_insert_initiatives" on strategy_initiatives for insert to authenticated
  with check (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_update_initiatives" on strategy_initiatives for update to authenticated
  using (user_belongs_to_tenant(auth.uid(), tenant_id));
create policy "tenant_delete_initiatives" on strategy_initiatives for delete to authenticated
  using (is_admin_or_manager(auth.uid(), tenant_id));

-- ─── updated_at triggers ──────────────────────────────────────────────────────
create trigger set_updated_at_strategy_cycles before update on strategy_cycles
  for each row execute function update_updated_at_column();

create trigger set_updated_at_strategy_objectives before update on strategy_objectives
  for each row execute function update_updated_at_column();

create trigger set_updated_at_strategy_key_results before update on strategy_key_results
  for each row execute function update_updated_at_column();

create trigger set_updated_at_strategy_initiatives before update on strategy_initiatives
  for each row execute function update_updated_at_column();
