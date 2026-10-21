-- Reversão de 20261021170000_notes.sql.
-- Apaga as notas, os compartilhamentos e o índice dos anexos. Os ARQUIVOS no bucket
-- note-attachments não somem com o DROP: esvazie o bucket pelo painel antes de removê-lo.
DROP POLICY IF EXISTS "note-attachments: readers can read" ON storage.objects;
DROP POLICY IF EXISTS "note-attachments: author can upload" ON storage.objects;
DROP POLICY IF EXISTS "note-attachments: author can delete" ON storage.objects;

DROP TABLE IF EXISTS public.note_attachments;
DROP TABLE IF EXISTS public.note_shares;
DROP TABLE IF EXISTS public.notes;

DROP FUNCTION IF EXISTS public.notify_note_shared();
DROP FUNCTION IF EXISTS public.note_attachments_guard();
DROP FUNCTION IF EXISTS public.note_shares_guard();
DROP FUNCTION IF EXISTS public.notes_guard();
DROP FUNCTION IF EXISTS public.note_id_from_path(text);
DROP FUNCTION IF EXISTS public.my_employee_ids();
DROP FUNCTION IF EXISTS public.is_note_author(uuid);
DROP FUNCTION IF EXISTS public.readable_note_ids();

ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;
DELETE FROM public.user_capability_overrides WHERE capability = 'nota:usar';
DELETE FROM public.role_capabilities WHERE capability = 'nota:usar';
DELETE FROM public.default_role_capabilities WHERE capability = 'nota:usar';
DELETE FROM public.capabilities WHERE key = 'nota:usar';
ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;
