-- Reversão de 20261009130000_prospect_files.sql.
--
-- Perda de dado: a lista dos arquivos anexados direto na oportunidade. Os objetos continuam no
-- bucket prospect-attachments, órfãos — exportar `public.prospect_files` antes, se precisar
-- achá-los depois. Os anexos de atividade não são tocados.

DROP TABLE IF EXISTS public.prospect_files;
DROP FUNCTION IF EXISTS public.prospect_files_guard();
