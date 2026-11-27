-- US-0054 (26/11/2026): faixa de funcionários do LinkedIn, informada pelo time.
--
-- O LinkedIn mostra a empresa numa faixa (201 a 500), não num número. Guardar a faixa, e não um
-- número inventado, deixa claro na tela o que o time sabe. Nas contas (faturamento estimado e fit)
-- entra o ponto médio da faixa, calculado no código (decisão do Victor).
--
-- Precedência (US-0054, cenário 4): número exato do time, faixa do LinkedIn, RAIS plausível,
-- estimativa por empresas parecidas. Número exato e faixa não convivem: informar um apaga o outro,
-- e o banco recusa os dois juntos.
--
-- Segue a RLS da empresa (`prospeccao:ler` / `prospeccao:editar`), sem política nova.
-- Rollback: supabase/rollback/20261126110000_faixa_de_funcionarios_do_linkedin_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS funcionarios_faixa text,
  ADD CONSTRAINT prospect_companies_funcionarios_faixa_valida
    CHECK (funcionarios_faixa IS NULL OR funcionarios_faixa IN
      ('0-1', '2-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+')),
  ADD CONSTRAINT prospect_companies_funcionarios_exato_ou_faixa
    CHECK (funcionarios_faixa IS NULL OR funcionarios_informados IS NULL);

COMMENT ON COLUMN public.prospect_companies.funcionarios_faixa IS
  'Faixa de funcionários do LinkedIn, informada pelo time (US-0054). Vale depois do número exato '
  '(funcionarios_informados) e antes da RAIS; nas contas entra o ponto médio. Nulo = não informada.';
