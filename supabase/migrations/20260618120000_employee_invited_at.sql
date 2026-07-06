-- FUNC-J1: validação de expiração do link de primeiro acesso (TTL 7 dias).
-- Registra quando o convite foi enviado para que o primeiro acesso possa
-- recusar links expirados sem expor mensagens técnicas do Supabase.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.employees.invited_at IS
  'Momento do envio do convite (FUNC-J1). NULL para registros legados, que nunca expiram. Usado para validar o TTL de 7 dias do link de primeiro acesso.';
