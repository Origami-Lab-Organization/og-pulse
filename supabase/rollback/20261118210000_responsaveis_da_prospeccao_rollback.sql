-- Rollback de 20261118210000_responsaveis_da_prospeccao.
-- A janela de "Mover para abordar" volta a listar o diretório inteiro (código anterior).

DROP FUNCTION IF EXISTS public.get_prospeccao_responsaveis();
