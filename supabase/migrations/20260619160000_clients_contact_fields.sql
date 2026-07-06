-- GP-J1 (F3): campos de contato e dados complementares em clients.
-- Todas as colunas são NULL e herdam a RLS existente da tabela clients
-- (acesso por tenant_id inalterado — nenhuma policy é criada/alterada aqui).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_name  text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS segment       text,
  ADD COLUMN IF NOT EXISTS website       text,
  ADD COLUMN IF NOT EXISTS notes         text;
