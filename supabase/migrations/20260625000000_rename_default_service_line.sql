-- Renomeia a linha de serviço criada no backfill da HU-001.
-- Afeta apenas registros com o nome e descrição originais do backfill.
UPDATE public.service_lines
SET
  name        = 'Serviços Prestados',
  description = 'Serviços entregues pela empresa. Cada serviço possui um modelo de cobrança que define como é precificado.'
WHERE name        = 'Serviços Gerais'
  AND description = 'Linha padrão criada na migração do catálogo (HU-001).';
