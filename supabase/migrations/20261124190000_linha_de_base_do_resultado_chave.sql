-- US-0039 — Objetivos do planejamento: cada resultado-chave nasce dizendo como será medido.
--
-- O GP cadastra o objetivo já com os resultados-chave, e cada um diz como medir (o indicador e
-- a fonte), a linha de base (de onde se parte), a meta e o prazo (decisão do Victor,
-- 24/11/2026). A meta (`target_value`), a unidade e o valor atual (`current_value`, do
-- acompanhamento) já existiam; faltavam a linha de base, o como medir e o prazo.
--
-- Só acrescenta colunas que aceitam nulo: os resultados-chave que já existem continuam
-- válidos, e o RLS de `project_key_results` não muda.
--
-- Rollback: supabase/rollback/20261124190000_linha_de_base_do_resultado_chave_rollback.sql

ALTER TABLE public.project_key_results
  ADD COLUMN IF NOT EXISTS baseline_value numeric,
  ADD COLUMN IF NOT EXISTS measurement text,
  ADD COLUMN IF NOT EXISTS target_date date;

COMMENT ON COLUMN public.project_key_results.baseline_value IS
  'Linha de base: o valor de onde o resultado-chave parte (US-0039). current_value segue o acompanhamento.';
COMMENT ON COLUMN public.project_key_results.measurement IS
  'Como medir: o indicador e a fonte do número (US-0039).';
COMMENT ON COLUMN public.project_key_results.target_date IS
  'Prazo para atingir a meta (US-0039).';
