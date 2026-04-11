-- ─── Templates de checklist por projeto ──────────────────────────────────────
create table if not exists project_activity_checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  type       text not null check (type in ('dor', 'dod')),
  items      jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (project_id, type)
);

create index if not exists project_activity_checklist_templates_project_id_idx
  on project_activity_checklist_templates(project_id);

alter table project_activity_checklist_templates enable row level security;

create policy "tenant isolation" on project_activity_checklist_templates
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

-- ─── Itens de checklist por card ─────────────────────────────────────────────
create table if not exists project_activity_card_checklist (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references project_activity_cards(id) on delete cascade,
  type       text not null check (type in ('dor', 'dod')),
  item_text  text not null,
  is_checked boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_activity_card_checklist_card_id_idx
  on project_activity_card_checklist(card_id);

alter table project_activity_card_checklist enable row level security;

create policy "tenant isolation" on project_activity_card_checklist
  using (
    exists (
      select 1 from project_activity_cards c
      where c.id = project_activity_card_checklist.card_id
        and c.tenant_id = (select tenant_id from employees where id = auth.uid())
    )
  );
