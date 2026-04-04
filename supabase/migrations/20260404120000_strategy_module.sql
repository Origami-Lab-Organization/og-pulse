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

create policy "tenant isolation" on strategy_cycles
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

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

create policy "tenant isolation" on strategy_objectives
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

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

create policy "tenant isolation" on strategy_key_results
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

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

create policy "tenant isolation" on strategy_checkins
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

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

create policy "tenant isolation" on strategy_initiatives
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

-- ─── updated_at triggers ──────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on strategy_cycles
  for each row execute function set_updated_at();

create trigger set_updated_at before update on strategy_objectives
  for each row execute function set_updated_at();

create trigger set_updated_at before update on strategy_key_results
  for each row execute function set_updated_at();

create trigger set_updated_at before update on strategy_initiatives
  for each row execute function set_updated_at();
