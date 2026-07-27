-- ─────────────────────────────────────────────────────────────────────────────
-- Contrato de experiência (CLT Art. 445 §único): período de no máximo 90 dias
-- corridos a partir da admissão, podendo ser dividido em até 2 períodos (uma
-- única prorrogação). Sem essa informação, o cálculo de rescisão não tem como
-- saber se um desligamento aconteceu no prazo combinado (fim normal de
-- contrato por prazo determinado, sem multa) ou antes dele (Art. 479/480 CLT
-- — indenização ou desconto), ver src/lib/terminationCalcs.ts.
--
-- Só relevante para tipo_contratacao = 'CLT' — Menor Aprendiz tem regime de
-- prazo determinado próprio (Lei 10.097/2000), não a regra dos 90 dias.
-- Campos simples em `employees` (não versionados em `employee_versions` por
-- enquanto) — ver decisão documentada no plano de correção da rescisão.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS contrato_experiencia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS experiencia_periodo1_fim date,
  ADD COLUMN IF NOT EXISTS experiencia_prorrogado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS experiencia_periodo2_fim date;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_experiencia_periodo1_check,
  ADD CONSTRAINT employees_experiencia_periodo1_check CHECK (
    NOT contrato_experiencia
    OR (experiencia_periodo1_fim IS NOT NULL AND (data_admissao IS NULL OR experiencia_periodo1_fim > data_admissao))
  );

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_experiencia_periodo2_check,
  ADD CONSTRAINT employees_experiencia_periodo2_check CHECK (
    NOT experiencia_prorrogado
    OR (
      contrato_experiencia
      AND experiencia_periodo2_fim IS NOT NULL
      AND experiencia_periodo1_fim IS NOT NULL
      AND experiencia_periodo2_fim > experiencia_periodo1_fim
    )
  );

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_experiencia_90_dias_check,
  ADD CONSTRAINT employees_experiencia_90_dias_check CHECK (
    NOT contrato_experiencia
    OR data_admissao IS NULL
    OR (COALESCE(experiencia_periodo2_fim, experiencia_periodo1_fim) - data_admissao) <= 90
  );
