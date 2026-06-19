-- HU-001 — Novos tipos combinados de modelo de receita
-- Adiciona 3 combinações ao CHECK de service_revenue_models.model_type:
--   fixed_success_fee      → Escopo Fixo + Taxa de Sucesso
--   fixed_recurring        → Escopo Fixo + Recorrência
--   recurring_success_fee  → Recorrência + Taxa de Sucesso

ALTER TABLE public.service_revenue_models
  DROP CONSTRAINT IF EXISTS service_revenue_models_model_type_check;

ALTER TABLE public.service_revenue_models
  ADD CONSTRAINT service_revenue_models_model_type_check
  CHECK (model_type IN (
    'fixed',
    'recurring',
    'success_fee',
    'indication',
    'equity',
    'fixed_success_fee',
    'fixed_recurring',
    'recurring_success_fee'
  ));

COMMENT ON COLUMN public.service_revenue_models.model_type IS
  'Tipo do modelo: fixed, recurring, success_fee, indication, equity, fixed_success_fee, fixed_recurring, recurring_success_fee.';
