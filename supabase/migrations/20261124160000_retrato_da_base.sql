-- Prospecção — retrato da Base da Receita na empresa do Pulse (US-0014, ADR-0055, 24/11/2026).
--
-- O fit por serviço usa o tamanho real (funcionários da RAIS), a dívida ativa ajuizada, a
-- distância de Formiga e o faturamento estimado. Esses números moram na Base, na VPS (ADR-0053);
-- as empresas do Pulse não tinham nenhum deles, e a nota delas saturava em 75. Decisão do
-- Victor: guardar um retrato desses números na empresa ao entrar no Pulse, refeito depois de cada
-- carga da Base. É uma exceção registrada ao ADR-0053 (o faturamento "calculado" já tinha aberto
-- o precedente): só estes números, com a data, nunca a base inteira.
--
-- Quem grava:
--   * a tela, ao mover a empresa da Base para qualificação (a RLS de UPDATE da empresa vale);
--   * a Edge Function `retrato-da-base`, com a chave de serviço, pela função
--     `atualizar_retrato_da_base`, toda segunda-feira e depois de cada carga.
-- Leitura: herda as policies de `prospect_companies` (prospeccao:ler / :editar).
--
-- Rollback: supabase/rollback/20261124160000_retrato_da_base_rollback.sql

ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS base_funcionarios integer CHECK (base_funcionarios IS NULL OR base_funcionarios >= 0),
  ADD COLUMN IF NOT EXISTS base_divida_ajuizada numeric(16, 2) CHECK (base_divida_ajuizada IS NULL OR base_divida_ajuizada >= 0),
  ADD COLUMN IF NOT EXISTS base_distancia_km integer CHECK (base_distancia_km IS NULL OR base_distancia_km >= 0),
  ADD COLUMN IF NOT EXISTS base_faturamento_estimado numeric(16, 2) CHECK (base_faturamento_estimado IS NULL OR base_faturamento_estimado >= 0),
  ADD COLUMN IF NOT EXISTS base_faturamento_base text
    CHECK (base_faturamento_base IS NULL OR base_faturamento_base IN ('rais', 'capital', 'modelo', 'piso')),
  ADD COLUMN IF NOT EXISTS base_retrato_em timestamptz;

COMMENT ON COLUMN public.prospect_companies.base_funcionarios IS
  'Retrato da Base (US-0014): funcionários da RAIS na matriz. Os confirmados pelo time ficam em funcionarios_informados.';
COMMENT ON COLUMN public.prospect_companies.base_retrato_em IS
  'Quando o retrato da Base foi tirado; nulo = nunca (empresa fora da Base ou cadastrada antes).';

-- Grava o retrato de várias empresas de uma vez (Edge Function `retrato-da-base`). Só a chave de
-- serviço chama: atravessa os tenants, como a tarefa agendada que a dispara. Empresa da lista que
-- não está na Base recebe nulos com a data — o retrato diz "conferido, fora da Base".
CREATE OR REPLACE FUNCTION public.atualizar_retrato_da_base(p_retratos jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Só o Pulse atualiza o retrato da Base.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.prospect_companies c
     SET base_funcionarios = r.funcionarios,
         base_divida_ajuizada = r.divida_ajuizada,
         base_distancia_km = r.distancia_km,
         base_faturamento_estimado = r.faturamento_estimado,
         base_faturamento_base = r.faturamento_base,
         base_retrato_em = now()
    FROM jsonb_to_recordset(p_retratos) AS r(
      id uuid, funcionarios integer, divida_ajuizada numeric, distancia_km integer,
      faturamento_estimado numeric, faturamento_base text
    )
   WHERE c.id = r.id;
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_retrato_da_base(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_retrato_da_base(jsonb) TO service_role;

SELECT cron.unschedule('retrato-da-base-semanal')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retrato-da-base-semanal');

-- Segunda-feira, 09:00 UTC = 06:00 em Brasília, antes do expediente. Depois de uma carga fora do
-- calendário, a mesma função é chamada à mão.
SELECT cron.schedule('retrato-da-base-semanal', '0 9 * * 1', $job$
  SELECT net.http_post(
    url     := public.cron_secret('app_supabase_url') || '/functions/v1/retrato-da-base',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'Authorization', 'Bearer ' || public.cron_secret('app_service_role_key')),
    body    := '{}'::jsonb
  ) AS request_id
$job$);
