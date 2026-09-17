-- Reversão de 20260917110000_prospect_activity_attachments.sql.
--
-- ATENÇÃO: os arquivos já enviados são apagados junto. `DELETE FROM storage.buckets` falha
-- enquanto houver objeto, por isso os objetos saem primeiro — e isso é destrutivo e não tem
-- volta. Confira `SELECT count(*) FROM storage.objects WHERE bucket_id = 'prospect-attachments'`
-- antes de executar.
-- Sem BEGIN/COMMIT próprio: quem executa envolve com psql --single-transaction.

DROP POLICY IF EXISTS "prospect-attachments: editors can delete" ON storage.objects;
DROP POLICY IF EXISTS "prospect-attachments: editors can upload" ON storage.objects;
DROP POLICY IF EXISTS "prospect-attachments: readers can read" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'prospect-attachments';
DELETE FROM storage.buckets WHERE id = 'prospect-attachments';

ALTER TABLE public.prospect_activities DROP COLUMN IF EXISTS attachments;
