-- Reversão de 20261021130000_product_news_reads.sql.
-- Apaga só o registro de quem já viu cada edição: sem ele, a edição vigente volta a aparecer
-- uma vez para cada pessoa. Nenhum dado de negócio depende desta tabela.
DROP TABLE IF EXISTS public.product_news_reads;
