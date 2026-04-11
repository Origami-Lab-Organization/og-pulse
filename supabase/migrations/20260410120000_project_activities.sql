-- ─── Project Activity Cards ────────────────────────────────────────────────────
create table if not exists project_activity_cards (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references projects(id) on delete cascade,
  tenant_id           uuid not null references tenants(id) on delete cascade,
  title               text not null,
  card_type           text not null default 'story'
                        check (card_type in ('story', 'bug', 'tech_debt', 'task')),
  user_story          text,
  acceptance_criteria text,
  points              int,
  assignee_id         uuid references employees(id) on delete set null,
  column_name         text not null default 'product_backlog'
                        check (column_name in ('product_backlog', 'sprint_backlog', 'in_dev', 'in_test', 'in_deploy', 'done')),
  position            int not null default 0,
  sprint_id           uuid,
  is_blocked          boolean not null default false,
  blocked_reason      text,
  created_by          uuid not null references employees(id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists project_activity_cards_project_id_idx   on project_activity_cards(project_id);
create index if not exists project_activity_cards_tenant_id_idx    on project_activity_cards(tenant_id);
create index if not exists project_activity_cards_column_pos_idx   on project_activity_cards(project_id, column_name, position);

alter table project_activity_cards enable row level security;

create policy "tenant isolation" on project_activity_cards
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

-- ─── Project Activity Card History ─────────────────────────────────────────────
create table if not exists project_activity_card_history (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references project_activity_cards(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  changed_by uuid references employees(id) on delete set null,
  field      text not null,
  old_value  text,
  new_value  text,
  changed_at timestamptz not null default now()
);

create index if not exists project_activity_card_history_card_id_idx  on project_activity_card_history(card_id);
create index if not exists project_activity_card_history_tenant_id_idx on project_activity_card_history(tenant_id);

alter table project_activity_card_history enable row level security;

create policy "tenant isolation" on project_activity_card_history
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

-- ─── History trigger ───────────────────────────────────────────────────────────
create or replace function project_activity_cards_history()
returns trigger language plpgsql security definer as $$
declare
  v_employee_id uuid;
begin
  -- resolve the current employee from auth.uid()
  select id into v_employee_id from employees where id = auth.uid() limit 1;

  if TG_OP = 'INSERT' then
    insert into project_activity_card_history(card_id, tenant_id, changed_by, field, old_value, new_value)
    values (NEW.id, NEW.tenant_id, v_employee_id, 'status', null, NEW.column_name);

  elsif TG_OP = 'UPDATE' then
    if OLD.column_name is distinct from NEW.column_name then
      insert into project_activity_card_history(card_id, tenant_id, changed_by, field, old_value, new_value)
      values (NEW.id, NEW.tenant_id, v_employee_id, 'status', OLD.column_name, NEW.column_name);
    end if;
  end if;

  return NEW;
end;
$$;

create trigger project_activity_cards_history_trg
  after insert or update on project_activity_cards
  for each row execute function project_activity_cards_history();
