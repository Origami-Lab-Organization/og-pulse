-- Rollback de 20260910150000_owner_guide.sql (PUL-250).
--
-- Apaga a preferência de quem dispensou o guia. Quem havia dispensado volta a ver, se ainda
-- tiver passo pendente. Nenhum outro dado é afetado: o progresso nunca foi persistido aqui,
-- ele é derivado do que existe cadastrado.

DROP FUNCTION IF EXISTS public.restore_owner_guide();
DROP FUNCTION IF EXISTS public.dismiss_owner_guide();

ALTER TABLE public.employees DROP COLUMN IF EXISTS owner_guide_dismissed_at;
