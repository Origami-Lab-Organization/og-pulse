-- Adiciona o regime 'clt-pj' (CLT ou PJ) ao check constraint de regime_contratacao
ALTER TABLE public.job_openings
  DROP CONSTRAINT IF EXISTS job_openings_regime_contratacao_check;

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_regime_contratacao_check
  CHECK (regime_contratacao IN ('clt', 'pj', 'estagio', 'clt-pj'));
