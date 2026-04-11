-- ─── Project Activity Tags ────────────────────────────────────────────────────
create table if not exists project_activity_tags (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  color      text not null default '#64748b',
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists project_activity_tags_project_id_idx on project_activity_tags(project_id);
create index if not exists project_activity_tags_tenant_id_idx  on project_activity_tags(tenant_id);

alter table project_activity_tags enable row level security;

create policy "tenant isolation" on project_activity_tags
  using (tenant_id = (select tenant_id from employees where id = auth.uid()));

-- ─── Project Activity Card Tags (junction) ────────────────────────────────────
create table if not exists project_activity_card_tags (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references project_activity_cards(id) on delete cascade,
  tag_id     uuid not null references project_activity_tags(id)  on delete cascade,
  created_at timestamptz not null default now(),
  unique (card_id, tag_id)
);

create index if not exists project_activity_card_tags_card_id_idx on project_activity_card_tags(card_id);
create index if not exists project_activity_card_tags_tag_id_idx  on project_activity_card_tags(tag_id);

alter table project_activity_card_tags enable row level security;

-- RLS via the card's tenant isolation
create policy "tenant isolation" on project_activity_card_tags
  using (
    exists (
      select 1 from project_activity_cards c
      where c.id = project_activity_card_tags.card_id
        and c.tenant_id = (select tenant_id from employees where id = auth.uid())
    )
  );
