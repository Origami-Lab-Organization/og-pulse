-- Rollback de 20260910160000_guided_tour.sql (PUL-251).
--
-- Remove a marca de quem já viu o tour. Sem a coluna, o componente do tour não encontra o
-- estado, e a leitura defensiva do hook assume "já viu" — ninguém é apresentado à casa por
-- engano.

DROP FUNCTION IF EXISTS public.restart_tour();
DROP FUNCTION IF EXISTS public.complete_tour();

ALTER TABLE public.employees DROP COLUMN IF EXISTS tour_seen_at;
