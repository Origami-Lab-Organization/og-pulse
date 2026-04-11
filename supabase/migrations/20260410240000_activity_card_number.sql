-- ─── card_number: número sequencial por projeto ──────────────────────────────
alter table project_activity_cards
  add column if not exists card_number integer;

-- Função que atribui o próximo número dentro do projeto
create or replace function assign_activity_card_number()
returns trigger language plpgsql as $$
begin
  select coalesce(max(card_number), 0) + 1
    into new.card_number
    from project_activity_cards
   where project_id = new.project_id;
  return new;
end;
$$;

-- Trigger: executa antes de cada INSERT
create trigger trg_assign_activity_card_number
before insert on project_activity_cards
for each row execute function assign_activity_card_number();

-- Back-fill: numera cards existentes por ordem de criação dentro de cada projeto
with numbered as (
  select id,
         row_number() over (partition by project_id order by created_at) as rn
    from project_activity_cards
   where card_number is null
)
update project_activity_cards c
   set card_number = n.rn
  from numbered n
 where c.id = n.id;
