-- Rollback de 20260917140000_financial_settings_vigencia.sql (PUL-260).
--
-- ATENÇÃO: voltar atrás APAGA HISTÓRICO. A tabela volta a ter uma linha por tenant, e as
-- versões anteriores de cada empresa deixam de existir. Mantém-se a MAIS RECENTE por
-- vigência, que é a que a tela mostra hoje — nenhum número visível muda, mas o passado
-- se perde. Rode só se a decisão de versionar tiver sido revertida de fato.

-- 1. A função de simulação volta a ler a linha do tenant, sem data.
--    (Redefinida em bloco por 20260908150000_functions_off_has_role.sql; o caminho de volta
--     é reaplicar aquela migration, que é a definição anterior íntegra.)
DROP FUNCTION IF EXISTS public.financial_settings_at(uuid, date);

-- 2. Fica só a versão mais recente de cada tenant.
DELETE FROM public.financial_settings fs
 WHERE EXISTS (
   SELECT 1 FROM public.financial_settings mais_nova
    WHERE mais_nova.tenant_id = fs.tenant_id
      AND (mais_nova.effective_from, mais_nova.created_at) > (fs.effective_from, fs.created_at)
 );

-- 3. As restrições voltam ao formato de uma linha por empresa.
ALTER TABLE public.financial_settings
  DROP CONSTRAINT IF EXISTS financial_settings_tenant_vigencia_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_settings_tenant_id_key'
  ) THEN
    ALTER TABLE public.financial_settings
      ADD CONSTRAINT financial_settings_tenant_id_key UNIQUE (tenant_id);
  END IF;
END $$;

ALTER TABLE public.financial_settings
  DROP COLUMN IF EXISTS effective_from,
  DROP COLUMN IF EXISTS created_by;
