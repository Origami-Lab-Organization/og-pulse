-- Adiciona campos de informações bancárias/PIX ao cadastro do funcionário
-- Usado para definir onde o funcionário receberá seu salário (CLT, PJ, todos os tipos)

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pix_key_type text,
  ADD COLUMN IF NOT EXISTS pix_key     text,
  ADD COLUMN IF NOT EXISTS bank_name   text,
  ADD COLUMN IF NOT EXISTS bank_agency text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS bank_account_type text;

-- Nenhuma constraint NOT NULL pois o preenchimento é opcional no cadastro inicial.
-- Valores aceitos (não enforçados por check, validados no frontend):
--   pix_key_type: 'cpf' | 'cnpj' | 'telefone' | 'email' | 'aleatoria'
--   bank_account_type: 'corrente' | 'poupanca'
