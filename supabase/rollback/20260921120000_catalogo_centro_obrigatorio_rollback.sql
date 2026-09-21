-- Rollback de 20260921120000_catalogo_centro_obrigatorio.sql (PUL-247).
--
-- Devolve a coluna ao estado anulável. NÃO desfaz as classificações: os centros atribuídos
-- continuam onde estão, e os centros criados (Ausências, e os três padrões nos tenants
-- legados) continuam existindo.
--
-- É de propósito. Desclassificar em massa jogaria fora trabalho de decisão — quem decidiu
-- que Atestado Médico é ausência não decidiu isso por causa do NOT NULL. Se a intenção for
-- mesmo desfazer, é caso a caso pela tela.

ALTER TABLE public.services       ALTER COLUMN cost_center_id DROP NOT NULL;
ALTER TABLE public.activity_types ALTER COLUMN cost_center_id DROP NOT NULL;

DROP FUNCTION IF EXISTS public.e_ausencia(text);
