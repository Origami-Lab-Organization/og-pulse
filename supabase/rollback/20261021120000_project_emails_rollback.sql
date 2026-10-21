-- Reversão de 20261021120000_project_emails.sql.
-- Apaga as cópias de e-mail salvas nos projetos. Os anexos copiados para o OneDrive ficam
-- onde estão: são arquivos da pasta do projeto, e o OneDrive é o dono deles (ADR-0019).
DROP FUNCTION IF EXISTS public.projects_for_email_save();
DROP TABLE IF EXISTS public.project_emails;
DROP FUNCTION IF EXISTS public.project_emails_guard();
DROP FUNCTION IF EXISTS public.can_save_project_email(uuid, uuid);
DROP FUNCTION IF EXISTS public.email_readable_project_ids();

ALTER TABLE public.role_capabilities DISABLE TRIGGER trg_role_capabilities_keeps_admin;
ALTER TABLE public.user_capability_overrides DISABLE TRIGGER trg_user_capability_overrides_keeps_admin;

DELETE FROM public.user_capability_overrides
 WHERE capability IN ('email-projeto:ler', 'email-projeto:salvar');
DELETE FROM public.role_capabilities
 WHERE capability IN ('email-projeto:ler', 'email-projeto:salvar');
DELETE FROM public.default_role_capabilities
 WHERE capability IN ('email-projeto:ler', 'email-projeto:salvar');
DELETE FROM public.capabilities
 WHERE key IN ('email-projeto:ler', 'email-projeto:salvar');

ALTER TABLE public.user_capability_overrides ENABLE TRIGGER trg_user_capability_overrides_keeps_admin;
ALTER TABLE public.role_capabilities ENABLE TRIGGER trg_role_capabilities_keeps_admin;
