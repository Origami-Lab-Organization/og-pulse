-- Rollback da 20261126100000 (US-0053). Apaga os itens do estudo e as ligações com o OneDrive; os
-- arquivos continuam no OneDrive.
DROP TABLE IF EXISTS public.prospect_company_estudo;
ALTER TABLE public.prospect_companies
  DROP COLUMN IF EXISTS onedrive_drive_id,
  DROP COLUMN IF EXISTS onedrive_item_id;
DROP TABLE IF EXISTS public.onedrive_do_comercial;
