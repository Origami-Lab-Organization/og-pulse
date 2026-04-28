alter table public.strategy_initiatives
add column if not exists notes text;

update public.strategy_initiatives
set notes = description
where notes is null
  and description is not null;
