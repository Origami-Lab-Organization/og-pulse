-- Recarrega o schema cache do PostgREST para expor o campo capacity_hours
-- adicionado em 20260519190000_allocation_historical_capacity.sql
NOTIFY pgrst, 'reload schema';
