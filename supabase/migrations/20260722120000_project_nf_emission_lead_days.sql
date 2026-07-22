-- ─────────────────────────────────────────────────────────────────────────────
-- Antecedência (em dias) para o lembrete de emissão de NF de cada parcela.
--
-- Definida no assistente de geração automática de parcelas (fase Planejamento)
-- e usada para derivar, no client/DTO, a data de lembrete de cada parcela
-- (vencimento − antecedência). Nenhuma tabela financeira nova: apenas um
-- parâmetro de projeto. `atrasado` continua sendo sempre derivado, nunca
-- persistido.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS nf_emission_lead_days integer NOT NULL DEFAULT 7;

COMMENT ON COLUMN public.projects.nf_emission_lead_days
  IS 'Dias de antecedência para o lembrete de emissão de NF antes do vencimento de cada parcela.';
