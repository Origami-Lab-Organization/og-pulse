-- Rollback de 20261123160000_anel_e_tier_saem.sql: devolve as colunas Anel e Tier, com os
-- CHECKs e os valores guardados em legado_prospeccao. O tipo de conta convertido do Tier fica
-- como está (a conversão é por script, fora da migration).

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS ring text,
  ADD COLUMN IF NOT EXISTS tier text;

ALTER TABLE public.prospect_companies
  ADD CONSTRAINT prospect_companies_ring_length CHECK (ring IS NULL OR char_length(ring) <= 60),
  ADD CONSTRAINT prospect_companies_tier_length CHECK (tier IS NULL OR char_length(tier) <= 60);

UPDATE public.prospect_companies c
   SET ring = l.anel, tier = l.tier
  FROM legado_prospeccao.empresas_anel_tier l
 WHERE l.company_id = c.id;

-- A cópia em legado_prospeccao fica; apague à mão se quiser:
-- DROP TABLE legado_prospeccao.empresas_anel_tier; DROP SCHEMA legado_prospeccao;
