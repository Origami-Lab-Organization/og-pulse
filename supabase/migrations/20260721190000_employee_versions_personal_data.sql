-- Unifica dados pessoais (aba "Dados") no mesmo mecanismo de versionamento
-- financeiro (employee_versions) — qualquer edição em nome, telefone, CPF,
-- data de nascimento, admissão, foto, cargo/permissão de sistema ou dados
-- bancários/PIX passa a fechar a versão vigente (congelando o estado
-- anterior) e abrir uma nova, exatamente como já acontece para salário/
-- encargos/tipo de contratação. Sem isso, a aba Histórico não refletia
-- nenhuma mudança cadastral — só financeira.
--
-- Nullable e sem DEFAULT: versões já existentes (criadas antes desta coluna
-- existir) ficam com NULL — o código de leitura (EmployeeVersionsTable) trata
-- isso mostrando "—", sem quebrar linhas antigas. A partir de agora, toda
-- versão nova (fechamento ou abertura) grava o valor vigente naquele momento.
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS data_admissao DATE;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS system_role TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS is_gerente BOOLEAN;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS pix_key_type TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS bank_account_type TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS bank_agency TEXT;
ALTER TABLE public.employee_versions ADD COLUMN IF NOT EXISTS bank_account TEXT;
